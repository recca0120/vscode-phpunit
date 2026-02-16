import { extname, join } from 'node:path';
import { Minimatch } from 'minimatch';
import { URI } from 'vscode-uri';
import { type PHPUnitXML, type TestDefinition, TestParser, type TestSuite } from '../index';
import { ClassRegistry } from '../TestParser/ClassRegistry';
import { TestDefinitionCollector } from './TestDefinitionCollector';

export interface File<T> {
    testsuite: string;
    uri: URI;
    tests: T[];
}

export class TestCollection {
    private suites = new Map<string, Map<string, TestDefinition[]>>();
    private matcherCache = new Map<string, Map<string, Minimatch>>();
    private fileIndex = new Map<string, string>();
    private classRegistry = new ClassRegistry();

    constructor(private phpUnitXML: PHPUnitXML) {}

    get size() {
        return this.suites.size;
    }

    getRootUri() {
        return URI.file(this.phpUnitXML.root());
    }

    items() {
        for (const suite of this.phpUnitXML.getTestSuites()) {
            if (!this.suites.has(suite.name)) {
                this.suites.set(suite.name, new Map<string, TestDefinition[]>());
            }
        }

        return this.suites;
    }

    clearMatcherCache() {
        this.matcherCache.clear();
    }

    async add(uri: URI) {
        return this.has(uri) ? this : this.change(uri);
    }

    async change(uri: URI) {
        const testsuite = this.parseTestsuite(uri);
        if (!testsuite) {
            return this;
        }

        const files = this.items();
        const testDefinitions = await this.parseTests(uri, testsuite);
        if (testDefinitions.length === 0) {
            this.delete(uri);
        } else {
            this.updateTestsForFile(uri, testsuite, testDefinitions);
        }

        // Re-parse child classes that depend on classes defined in this file
        await this.reparseChildClasses(uri);

        return this;
    }

    private async reparseChildClasses(uri: URI) {
        // Find all classes registered from this file in the registry
        const classesInFile = this.classRegistry.getClassesByUri(uri.fsPath);

        for (const classInfo of classesInFile) {
            const dependents = [
                ...this.classRegistry.getChildClasses(classInfo.classFQN),
                ...this.classRegistry.getTraitUsers(classInfo.classFQN),
            ];
            for (const child of dependents) {
                if (child.uri === uri.fsPath) {
                    continue;
                }
                const childUri = URI.file(child.uri);
                const childTestsuite = this.parseTestsuite(childUri);
                if (!childTestsuite) {
                    continue;
                }
                const childTests = await this.parseTests(childUri, childTestsuite);
                if (childTests.length > 0) {
                    this.updateTestsForFile(childUri, childTestsuite, childTests);
                }
            }
        }
    }

    get(uri: URI) {
        return this.findFile(uri)?.tests;
    }

    has(uri: URI) {
        return !!this.findFile(uri);
    }

    delete(uri: URI) {
        const file = this.findFile(uri);

        return file ? this.deleteFile(file) : false;
    }

    reset() {
        for (const file of this.gatherFiles()) {
            this.deleteFile(file);
        }
        this.suites.clear();
        this.matcherCache.clear();
        this.fileIndex.clear();
        this.classRegistry.clear();

        return this;
    }

    findFile(uri: URI): File<TestDefinition> | undefined {
        const uriStr = uri.toString();
        const testsuite = this.fileIndex.get(uriStr);
        if (!testsuite) {
            return undefined;
        }

        const tests = this.items().get(testsuite)?.get(uriStr);
        if (!tests) {
            return undefined;
        }

        return { testsuite, uri, tests };
    }

    protected async parseTests(uri: URI, testsuite: string) {
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        await testParser.parseFile(uri.fsPath, testsuite);

        return testDefinitionBuilder.get();
    }

    protected createTestParser() {
        const testParser = new TestParser(this.phpUnitXML, this.classRegistry);
        const testDefinitionBuilder = new TestDefinitionCollector(testParser);

        return { testParser, testDefinitionBuilder };
    }

    protected deleteFile(file: File<TestDefinition>) {
        this.fileIndex.delete(file.uri.toString());
        return this.items().get(file.testsuite)?.delete(file.uri.toString());
    }

    protected *gatherFiles() {
        for (const [testsuite, files] of this.items()) {
            for (const [uriStr, tests] of files) {
                yield { testsuite, uri: URI.parse(uriStr), tests };
            }
        }
    }

    private updateTestsForFile(uri: URI, testsuite: string, tests: TestDefinition[]) {
        this.items().get(testsuite)?.set(uri.toString(), tests);
        this.fileIndex.set(uri.toString(), testsuite);
    }

    private parseTestsuite(uri: URI) {
        const testSuites = this.phpUnitXML.getTestSuites();
        const testsuite = testSuites.find((item) => {
            return ['directory', 'file'].includes(item.tag) && this.match(item, uri);
        });

        if (!testsuite) {
            return;
        }

        const exclude = testSuites.find((item) => {
            return item.name === testsuite.name && item.tag === 'exclude' && this.match(item, uri);
        });

        if (exclude) {
            return;
        }

        return testsuite.name;
    }

    private match(testSuite: TestSuite, uri: URI) {
        const workspace = this.getRootUri();
        const isFile =
            testSuite.tag === 'file' || (testSuite.tag === 'exclude' && extname(testSuite.value));

        if (isFile) {
            return join(workspace.fsPath, testSuite.value) === uri.fsPath;
        }

        const suffix = testSuite.suffix ?? '.php';

        let suffixMap = this.matcherCache.get(testSuite.value);
        if (!suffixMap) {
            suffixMap = new Map();
            this.matcherCache.set(testSuite.value, suffixMap);
        }

        let minimatch = suffixMap.get(suffix);
        if (!minimatch) {
            minimatch = new Minimatch(
                URI.file(join(workspace.fsPath, testSuite.value, `/**/*${suffix}`)).toString(true),
                { matchBase: true, nocase: true },
            );
            suffixMap.set(suffix, minimatch);
        }

        return minimatch.match(uri.toString(true));
    }
}
