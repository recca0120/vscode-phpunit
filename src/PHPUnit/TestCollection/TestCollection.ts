import { Minimatch } from 'minimatch';
import { extname, join, normalize } from 'node:path'; // Import normalize
import { URI } from 'vscode-uri';
import { PHPUnitXML, TestDefinition, TestParser, TestSuite } from '../index';
import { TestDefinitionBuilder } from './TestDefinitionBuilder';

export interface File<T> {
    testsuite: string;
    uri: URI;
    tests: T[];
}

// Removed custom collection classes (Base, TestDefinitions, Files, Workspace)
// Will use standard Map objects directly in TestCollection

export class TestCollection {
    // Use nested standard Maps for storing test definitions
    // Map<workspacePath, Map<testsuiteName, Map<fileUri, TestDefinition[]>>>
    private readonly _workspaces: Map<string, Map<string, Map<URI, TestDefinition[]>>>;

    constructor(private phpUnitXML: PHPUnitXML) {
        this._workspaces = new Map();
    }

    get size(): number {
        // Return the number of workspaces
        return this._workspaces.size;
    }

    getWorkspace(): URI {
        return URI.file(this.phpUnitXML.root());
    }

    // Get the Map of testsuites for the current workspace
    private getTestsuitesForWorkspace(): Map<string, Map<URI, TestDefinition[]>> {
        const workspacePath = this.getWorkspace().fsPath;
        if (!this._workspaces.has(workspacePath)) {
            const testsuitesMap = new Map<string, Map<URI, TestDefinition[]>>();
            // Initialize with testsuites from phpunit.xml
            this.phpUnitXML.getTestSuites().forEach((suite) => testsuitesMap.set(suite.name, new Map()));
            this._workspaces.set(workspacePath, testsuitesMap);
        }
        return this._workspaces.get(workspacePath)!;
    }

    async add(uri: URI): Promise<this> {
        // If the file already exists, no need to re-add unless its content changed (handled by change method)
        // The change method is responsible for parsing and updating if the file is relevant
        return this.change(uri);
    }

    async change(uri: URI): Promise<this> {
        const testsuiteName = this.parseTestsuite(uri);
        if (!testsuiteName) {
            // If the file doesn't belong to any testsuite or is excluded, delete it if it exists
            this.delete(uri);
            return this;
        }

        const testsuitesMap = this.getTestsuitesForWorkspace();
        const filesMap = testsuitesMap.get(testsuiteName);

        if (!filesMap) {
             // This should not happen if getTestsuitesForWorkspace initializes correctly,
             // but as a safeguard, log a warning and skip.
             console.warn(`Testsuite "${testsuiteName}" not found for workspace.`);
             return this;
        }

        const testDefinitions = await this.parseTests(uri, testsuiteName);

        if (testDefinitions.length === 0) {
            // If no tests found in the file, remove it from the collection
            filesMap.delete(uri);
        } else {
            // Otherwise, add or update the file's test definitions
            filesMap.set(uri, testDefinitions);
        }

        return this;
    }

    get(uri: URI): TestDefinition[] | undefined {
        // Corrected return type to TestDefinition[] | undefined
        const file = this.findFile(uri);
        return file?.tests;
    }

    has(uri: URI): boolean {
        return !!this.findFile(uri);
    }

    delete(uri: URI): boolean {
        const file = this.findFile(uri);
        if (!file) {
            return false;
        }
        const testsuitesMap = this.getTestsuitesForWorkspace();
        const filesMap = testsuitesMap.get(file.testsuite);
        if (filesMap) {
            return filesMap.delete(uri);
        }
        return false;
    }

    reset(): this {
        // Clear all nested maps for the current workspace
        const workspacePath = this.getWorkspace().fsPath;
        if (this._workspaces.has(workspacePath)) {
            const testsuitesMap = this._workspaces.get(workspacePath)!;
            testsuitesMap.forEach(filesMap => filesMap.clear());
            testsuitesMap.clear();
            this._workspaces.delete(workspacePath);
        }
        // Re-initialize the testsuites for the current workspace
        this.getTestsuitesForWorkspace();

        return this;
    }

    findFile(uri: URI): File<TestDefinition> | undefined {
        // Corrected return type to File<TestDefinition> | undefined
        const testsuitesMap = this.getTestsuitesForWorkspace();
        for (const [testsuiteName, filesMap] of testsuitesMap) {
            if (filesMap.has(uri)) {
                // The tests property is TestDefinition[], so T is TestDefinition
                return { testsuite: testsuiteName, uri, tests: filesMap.get(uri)! };
            }
        }
        return undefined;
    }

    // Generator to iterate over all files in the collection for the current workspace
    private* gatherFiles(): Generator<File<TestDefinition>> {
        // Corrected generator type to Generator<File<TestDefinition>>
        const testsuitesMap = this.getTestsuitesForWorkspace();
        for (const [testsuiteName, filesMap] of testsuitesMap) {
            for (const [uri, tests] of filesMap) {
                yield { testsuite: testsuiteName, uri, tests };
            }
        }
    }

    protected async parseTests(uri: URI, testsuite: string): Promise<TestDefinition[]> {
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        await testParser.parseFile(uri.fsPath, testsuite);

        return testDefinitionBuilder.get();
    }

    protected createTestParser(): { testParser: TestParser; testDefinitionBuilder: TestDefinitionBuilder } {
        const testParser = new TestParser(this.phpUnitXML);
        const testDefinitionBuilder = new TestDefinitionBuilder(testParser);

        return { testParser, testDefinitionBuilder };
    }

    // Removed deleteFile as it's integrated into the delete method

    private parseTestsuite(uri: URI): string | undefined {
        const testSuites = this.phpUnitXML.getTestSuites();
        const matchingSuite = testSuites.find(item => {
            return ['directory', 'file'].includes(item.tag) && this.match(item, uri);
        });

        if (!matchingSuite) {
            return undefined;
        }

        // Check for exclusion within the same testsuite name
        const isExcluded = testSuites.some((item) => {
            return item.name === matchingSuite.name && item.tag === 'exclude' && this.match(item, uri);
        });

        if (isExcluded) {
            return undefined;
        }

        return matchingSuite.name;
    }

    private match(testSuite: TestSuite, uri: URI): boolean {
        const workspace = this.getWorkspace();
        const isFileMatch = testSuite.tag === 'file' || (testSuite.tag === 'exclude' && extname(testSuite.value));

        if (isFileMatch) {
            // Normalize paths for comparison
            return normalize(join(workspace.fsPath, testSuite.value)) === normalize(uri.fsPath);
        }

        // Directory match using Minimatch
        const suffix = testSuite.suffix ?? '.php';
        const globPattern = URI.file(join(workspace.fsPath, testSuite.value, `/**/*${suffix}`)).toString(true);

        const minimatch = new Minimatch(
            globPattern,
            { matchBase: true, nocase: true },
        );

        return minimatch.match(uri.toString(true));
    }
}
