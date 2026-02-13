import { extname, join } from 'node:path';
import { Minimatch } from 'minimatch';
import { URI } from 'vscode-uri';
import { type PHPUnitXML, type TestDefinition, TestParser, type TestSuite } from '../index';
import { TestDefinitionCollector } from './TestDefinitionCollector';

export interface File<T> {
    testsuite: string;
    uri: URI;
    tests: T[];
}

export class TestCollection {
    private suites = new Map<string, Map<string, Map<string, TestDefinition[]>>>();

    constructor(private phpUnitXML: PHPUnitXML) {}

    get size() {
        return this.suites.size;
    }

    getWorkspace() {
        return URI.file(this.phpUnitXML.root());
    }

    items() {
        const workspace = this.getWorkspace();
        if (!this.suites.has(workspace.fsPath)) {
            const testsuites = new Map<string, Map<string, TestDefinition[]>>();
            this.phpUnitXML
                .getTestSuites()
                .forEach((suite) =>
                    testsuites.set(suite.name, new Map<string, TestDefinition[]>()),
                );
            this.suites.set(workspace.fsPath, testsuites);
        }

        return this.suites.get(workspace.fsPath)!;
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
        }
        files.get(testsuite)?.set(uri.toString(), testDefinitions);

        return this;
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
        this.suites.delete(this.getWorkspace().fsPath);

        return this;
    }

    findFile(uri: URI): File<TestDefinition> | undefined {
        for (const file of this.gatherFiles()) {
            if (uri.toString() === file.uri.toString()) {
                return file;
            }
        }

        return undefined;
    }

    protected async parseTests(uri: URI, testsuite: string) {
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        await testParser.parseFile(uri.fsPath, testsuite);

        return testDefinitionBuilder.get();
    }

    protected createTestParser() {
        const testParser = new TestParser(this.phpUnitXML);
        const testDefinitionBuilder = new TestDefinitionCollector(testParser);

        return { testParser, testDefinitionBuilder };
    }

    protected deleteFile(file: File<TestDefinition>) {
        return this.items().get(file.testsuite)?.delete(file.uri.toString());
    }

    private *gatherFiles() {
        for (const [testsuite, files] of this.items()) {
            for (const [uriStr, tests] of files) {
                yield { testsuite, uri: URI.parse(uriStr), tests };
            }
        }
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
        const workspace = this.getWorkspace();
        const isFile =
            testSuite.tag === 'file' || (testSuite.tag === 'exclude' && extname(testSuite.value));

        if (isFile) {
            return join(workspace.fsPath, testSuite.value) === uri.fsPath;
        }

        const suffix = testSuite.suffix ?? '.php';

        const minimatch = new Minimatch(
            URI.file(join(workspace.fsPath, testSuite.value, `/**/*${suffix}`)).toString(true),
            { matchBase: true, nocase: true },
        );

        return minimatch.match(uri.toString(true));
    }
}
