import { Position, TestController, TestItem, TestRunRequest } from 'vscode';
import { URI } from 'vscode-uri';
import {
    PHPUnitXML, TestDefinition, TestType,
} from '../PHPUnit'; // Removed CustomWeakMap and BaseTestCollection import
import { TestCase } from './TestCase';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';
import { Minimatch } from 'minimatch'; // Import Minimatch
import { extname, join, normalize } from 'node:path'; // Import path functions
import { TestParser } from '../PHPUnit/TestParser/TestParser'; // Import TestParser
import { TestDefinitionBuilder } from '../PHPUnit/TestCollection/TestDefinitionBuilder'; // Import TestDefinitionBuilder


// Removed File interface as it's no longer strictly necessary with direct Map usage,
// but keeping it for clarity if needed elsewhere.
export interface File<T> {
    testsuite: string;
    uri: URI;
    tests: T[];
}


export class TestCollection {
    // Use nested standard Maps for storing test items and test cases
    // Map<workspacePath, Map<testsuiteName, Map<testItemId, TestItem>>>
    private readonly testItems: Map<string, Map<string, Map<string, TestItem>>>;
    // Map<testItemId, TestCase> - Using a single map for TestCase instances keyed by TestItem id
    private readonly testCases: Map<string, TestCase>;


    constructor(private ctrl: TestController, private phpUnitXML: PHPUnitXML) { // Removed inheritance
        this.testItems = new Map();
        this.testCases = new Map();
    }

    // Get the Map of testsuites for the current workspace
    private getTestsuitesForWorkspace(): Map<string, Map<string, TestItem>> {
        const workspacePath = this.getWorkspace().fsPath;
        if (!this.testItems.has(workspacePath)) {
            const testsuitesMap = new Map<string, Map<string, TestItem>>();
            // Initialize with testsuites from phpunit.xml
            this.phpUnitXML.getTestSuites().forEach((suite) => testsuitesMap.set(suite.name, new Map()));
            this.testItems.set(workspacePath, testsuitesMap);
        }
        return this.testItems.get(workspacePath)!;
    }

    getTestCase(testItem: TestItem): TestCase | undefined {
        return this.testCases.get(testItem.id);
    }

    // Public method to add a file to the collection
    async add(uri: URI): Promise<this> {
        // The change method handles parsing and adding/updating if the file is relevant
        return this.change(uri);
    }

    // Public method to handle file changes (add or update)
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

        // Parse tests and update internal maps and TestController
        await this.parseTests(uri, testsuiteName);

        return this;
    }

    // Public method to delete a file from the collection
    delete(uri: URI): boolean {
        const testsuitesMap = this.getTestsuitesForWorkspace();
        let deleted = false;
        testsuitesMap.forEach(filesMap => {
            const itemsToRemove: string[] = [];
            filesMap.forEach(testItem => {
                if (testItem.uri?.toString() === uri.toString()) {
                    // Mark for removal from internal maps
                    itemsToRemove.push(testItem.id);
                    deleted = true; // Mark as deleted if at least one item is found
                }
            });
            // Remove from internal maps and TestController
            itemsToRemove.forEach(itemId => {
                const testItem = filesMap.get(itemId);
                if (testItem) {
                    testItem.parent ? testItem.parent.children.delete(testItem.id) : this.ctrl.items.delete(testItem.id);
                    this.testCases.delete(testItem.id);
                    filesMap.delete(itemId);
                }
            });
        });
        return deleted;
    }


    findTestsByFile(uri: URI): TestItem[] {
        const tests: TestItem[] = [];
        const testsuitesMap = this.getTestsuitesForWorkspace();
        for (const [, filesMap] of testsuitesMap) {
            for (const [, testItem] of filesMap) {
                // Check if the test item's URI matches the file URI and it's a class type (test suite)
                const testCase = this.testCases.get(testItem.id);
                if (testItem.uri?.toString() === uri.toString() && testCase?.type === TestType.class) {
                    tests.push(testItem);
                }
            }
        }
        return tests;
    }

    findTestsByPosition(uri: URI, position: Position): TestItem[] {
        const items: TestItem[] = [];
        const testsuitesMap = this.getTestsuitesForWorkspace();
         for (const [, filesMap] of testsuitesMap) {
            for (const [, testItem] of filesMap) {
                const testCase = this.testCases.get(testItem.id);
                 // Check if the test item is in the given file and position range, and is a method or describe type
                if (testItem.uri?.toString() === uri.toString() && testItem.range && testCase && [TestType.describe, TestType.method].includes(testCase.type)) {
                    if (position.line >= testItem.range.start.line && position.line <= testItem.range.end.line) {
                         items.push(testItem);
                    }
                }
            }
        }

        // Sort by proximity to the position (closer lines first)
        items.sort((a, b) => {
            const posA = a.range!.start.line;
            const posB = b.range!.start.line;
            const diffA = Math.abs(posA - position.line);
            const diffB = Math.abs(posB - position.line);
            return diffA - diffB; // Sort ascending by difference
        });


        // If items found at position, return the closest one, otherwise return tests by file
        return items.length > 0 ? [items[0]] : this.findTestsByFile(uri);
    }


    findTestsByRequest(request?: TestRunRequest): TestItem[] | undefined {
        if (!request || !request.include) {
            return undefined;
        }

        const include = request.include;
        const tests: TestItem[] = [];
        const testsuitesMap = this.getTestsuitesForWorkspace();
        for (const [, filesMap] of testsuitesMap) {
            for (const [, testItem] of filesMap) {
                // Check if the test item is included in the request
                if (include.some(item => item.id === testItem.id)) {
                    tests.push(testItem);
                }
            }
        }

        return tests.length > 0 ? tests : undefined;
    }

    reset(): this {
        // Clear all test items and test cases for the current workspace
        const workspacePath = this.getWorkspace().fsPath;
        if (this.testItems.has(workspacePath)) {
            const testsuitesMap = this.testItems.get(workspacePath)!;
            testsuitesMap.forEach(filesMap => {
                filesMap.forEach(testItem => {
                    // Remove test item from VS Code Test Explorer
                    testItem.parent ? testItem.parent.children.delete(testItem.id) : this.ctrl.items.delete(testItem.id);
                    // Remove test case
                    this.testCases.delete(testItem.id);
                });
                filesMap.clear();
            });
            testsuitesMap.clear();
            this.testItems.delete(workspacePath);
        }
        // Re-initialize the testsuites structure for the current workspace
        this.getTestsuitesForWorkspace();

        return this;
    }

    // Modified parseTests to populate testItems and testCases maps
    async parseTests(uri: URI, testsuiteName: string): Promise<TestDefinition[]> {
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        const testHierarchyBuilder = new TestHierarchyBuilder(this.ctrl, testParser); // TestHierarchyBuilder populates TestController

        // Parse the file and get raw test definitions
        const testDefinitions = await testParser.parseFile(uri.fsPath, testsuiteName) ?? [];

        // Build the test hierarchy in the TestController and get the mapping of TestItem to TestCase
        // TestHierarchyBuilder.get() returns Map<TestItem, TestCase>
        const testItemToTestCaseMap: Map<TestItem, TestCase> = testHierarchyBuilder.get();

        // Update the internal maps
        const testsuitesMap = this.getTestsuitesForWorkspace();
        const filesMap = testsuitesMap.get(testsuiteName);

        if (filesMap) {
             // Clear existing test items for this file before adding new ones
             this.removeTestItems(uri);

             // Add new test items and test cases
             testItemToTestCaseMap.forEach((testCase: TestCase, testItem: TestItem) => { // Added explicit types
                 filesMap.set(testItem.id, testItem); // Store TestItem by id
                 this.testCases.set(testItem.id, testCase); // Store TestCase by TestItem id
             });
        } else {
             console.warn(`Testsuite "${testsuiteName}" not found when parsing file ${uri.fsPath}.`);
        }


        return testDefinitions; // Return the raw test definitions
    }

    protected createTestParser(): { testParser: TestParser; testDefinitionBuilder: TestDefinitionBuilder } { // Corrected return types
        // This method remains the same, creating parser and builder instances
        const testParser = new TestParser(this.phpUnitXML);
        const testDefinitionBuilder = new TestDefinitionBuilder(testParser);

        return { testParser, testDefinitionBuilder };
    }

    // Removed deleteFile as its logic is integrated into the delete method

    // Helper to remove test items associated with a file URI from TestController and internal maps
    private removeTestItems(uri: URI): void {
        const testsuitesMap = this.getTestsuitesForWorkspace();
        testsuitesMap.forEach(filesMap => {
            const itemsToRemove: string[] = [];
            filesMap.forEach(testItem => {
                if (testItem.uri?.toString() === uri.toString()) {
                    // Remove from VS Code Test Explorer
                    testItem.parent ? testItem.parent.children.delete(testItem.id) : this.ctrl.items.delete(testItem.id);
                    // Remove test case
                    this.testCases.delete(testItem.id);
                }
            });
            // Remove from internal maps
            itemsToRemove.forEach(itemId => {
                filesMap.delete(itemId);
                this.testCases.delete(itemId);
            });
        });
    }


    private getWorkspace(): URI {
        return URI.file(this.phpUnitXML.root());
    }

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

    private match(testSuite: any, uri: URI): boolean { // Use any for testSuite type due to import issues
        const workspace = this.getWorkspace();
        // Corrected typo and parenthesis placement
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
