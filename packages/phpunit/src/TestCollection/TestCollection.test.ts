import { beforeAll, describe, expect, it } from 'vitest';
import { URI } from 'vscode-uri';
import { generateXML, phpUnitProject } from '../../tests/utils';
import { PhpParserAstParser } from '../Interpreter/AstParser/PhpParser/PhpParserAstParser';
import { TreeSitterAstParser } from '../Interpreter/AstParser/TreeSitter/TreeSitterAstParser';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
import { ChainAstParser, PHPUnitXML, type TestDefinition, TestParser, TestType } from '../index';
import { TeamcityEvent, type TestStarted } from '../TestOutput';
import { ClassHierarchy } from '../TestParser/ClassHierarchy';
import { TestCollection } from './TestCollection';

beforeAll(async () => initTreeSitter());

describe('TestCollection', () => {
    const phpUnitXML = new PHPUnitXML();
    const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
    const testParser = new TestParser(phpUnitXML, astParser);
    const testCollection = new TestCollection(phpUnitXML, testParser);

    const givenTestCollection = (text: string) => {
        phpUnitXML.load(generateXML(text), phpUnitProject('phpunit.xml'));
        testCollection.reset();

        return testCollection;
    };

    const shouldBe = async (
        collection: TestCollection,
        testsuites: Record<string, import('vscode-uri').URI[]>,
    ) => {
        const phpUnitXML = new PHPUnitXML();
        phpUnitXML.setRoot(phpUnitProject(''));
        const hierarchy = new ClassHierarchy();
        for (const [testsuite, files] of Object.entries(testsuites)) {
            const expected: TestDefinition[] = [];
            for (const uri of files as URI[]) {
                const astParser = new ChainAstParser([
                    new TreeSitterAstParser(),
                    new PhpParserAstParser(),
                ]);
                const testParser = new TestParser(phpUnitXML, astParser);
                const result = await testParser.parseFile(uri.fsPath, testsuite);
                if (result) {
                    for (const cls of result.classes) {
                        hierarchy.register(cls);
                    }
                    expected.push(...hierarchy.enrichTests(result.tests));
                }
            }
            const actual: TestDefinition[] = [];
            for (const file of collection.gatherFiles()) {
                if (file.testsuite === testsuite) {
                    actual.push(...file.tests);
                }
            }
            expect(actual).toEqual(expected);
        }
    };

    it('should clear state on reset', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const uri = URI.file(phpUnitProject('tests/AssertionsTest.php'));
        await collection.change(uri);
        expect(collection.has(uri)).toBe(true);

        collection.reset();
        expect(collection.has(uri)).toBe(false);
    });

    it('classHierarchy should be owned by TestCollection, not TestParser', () => {
        // TestParser should not expose classHierarchy
        expect(testParser).not.toHaveProperty('classHierarchy');
    });

    it('match testsuite directory', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const files = [
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            // URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.change(file);
        }

        await shouldBe(collection, { default: files });
    });

    it('match testsuite file', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <file>tests/AssertionsTest.php</file>
                </testsuite>
            </testsuites>`);

        const files = [URI.file(phpUnitProject('tests/AssertionsTest.php'))];
        for (const file of files) {
            await collection.change(file);
        }

        await shouldBe(collection, { default: files });
    });

    it('match testsuite exclude directory', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                    <exclude>tests/Unit</exclude>
                </testsuite>
            </testsuites>`);

        const files = [
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.change(file);
        }

        await shouldBe(collection, { default: [files[0]] });
    });

    it('match testsuite exclude file', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                    <exclude>tests/Unit/ExampleTest.php</exclude>
                </testsuite>
            </testsuites>`);

        const files = [
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.change(file);
        }

        await shouldBe(collection, { default: [files[0]] });
    });

    it('match three testsuites', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                </testsuite>
                <testsuite name="Feature">
                    <directory>tests/Feature</directory>
                </testsuite>
                <testsuite name="default">
                    <directory>tests</directory>
                    <exclude>tests/Unit/ExampleTest.php</exclude>
                    <exclude>tests/Feature/ExampleTest.php</exclude>
                </testsuite> 
            </testsuites>`);

        const files = [
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Feature/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.change(file);
        }

        await shouldBe(collection, {
            default: [files[0]],
            Unit: [files[1]],
            Feature: [files[2]],
        });
    });

    it('match *', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests/*/SubFolder</directory>
                </testsuite> 
            </testsuites>`);
        const files = [
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Unit/SubFolder/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Feature/SubFolder/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.change(file);
        }

        await shouldBe(collection, { default: [files[1], files[2]] });
    });

    it('match no case', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests/unit</directory>
                </testsuite> 
            </testsuites>`);

        const files = [URI.file(phpUnitProject('tests/Unit/ExampleTest.php'))];
        for (const file of files) {
            await collection.change(file);
        }

        await shouldBe(collection, {
            default: [files[0]],
        });
    });

    it('exclude abstract class', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite> 
            </testsuites>`);

        const files = [
            URI.file(phpUnitProject('tests/AbstractTest.php')),
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.change(file);
        }

        await shouldBe(collection, { default: [files[1], files[2]] });
    });

    it('unique file', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite> 
            </testsuites>`);

        const files = [
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.change(file);
        }

        await shouldBe(collection, { default: [files[0]] });
    });

    it('delete file', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite> 
            </testsuites>`);

        const files = [URI.file(phpUnitProject('tests/Unit/ExampleTest.php'))];
        for (const file of files) {
            await collection.change(file);
        }

        expect(collection.has(files[0])).toBeTruthy();
        expect(collection.delete(files[0])).toBeDefined();
        expect(collection.delete(files[0])).toBeUndefined();
        await shouldBe(collection, { default: [] });
    });

    it('change should remove file when it no longer contains tests', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        // AbstractTest.php is abstract, so it has 0 test definitions
        const abstractFile = URI.file(phpUnitProject('tests/AbstractTest.php'));

        // change() should not leave an empty entry in the collection
        await collection.change(abstractFile);
        expect(collection.has(abstractFile)).toBeFalsy();
    });

    it('delete should clear definitionIndex so resolveDataset works again', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const uri = URI.file(phpUnitProject('tests/AssertionsTest.php'));
        await collection.change(uri);

        const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
        const started = makeTestStarted(
            `${parentId} with data set #0`,
            'addition_provider with data set #0',
        );

        // resolve once to populate index
        expect(collection.resolveDataset(started)).toBeDefined();
        // second call returns undefined (already exists)
        expect(collection.resolveDataset(started)).toBeUndefined();

        // delete clears index, re-parse restores parent definitions
        collection.delete(uri);
        await collection.change(uri);

        // now resolveDataset should work again
        expect(collection.resolveDataset(started)).toBeDefined();
    });

    it('reset should clear definitionIndex so resolveDataset works again', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const uri = URI.file(phpUnitProject('tests/AssertionsTest.php'));
        await collection.change(uri);

        const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
        const started = makeTestStarted(
            `${parentId} with data set #0`,
            'addition_provider with data set #0',
        );

        expect(collection.resolveDataset(started)).toBeDefined();
        expect(collection.resolveDataset(started)).toBeUndefined();

        collection.reset();
        await collection.change(uri);

        expect(collection.resolveDataset(started)).toBeDefined();
    });

    it('reset', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                </testsuite> 
                <testsuite name="Feature">
                    <directory>tests/Feature</directory>
                </testsuite> 
            </testsuites>`);

        const files = [
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Feature/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.change(file);
        }
        expect(collection.size).toEqual(2);

        collection.reset();
        expect(collection.size).toEqual(0);
    });

    const makeTestStarted = (id: string, name: string): TestStarted => ({
        event: TeamcityEvent.testStarted,
        name,
        id,
        file: '',
        locationHint: '',
        flowId: 1,
    });

    describe('resolveDataset', () => {
        it('should resolve missing dataset child', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);
            await collection.change(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
            const result = collection.resolveDataset(
                makeTestStarted(
                    `${parentId} with data set #0`,
                    'addition_provider with data set #0',
                ),
            );

            expect(result).toBeDefined();
            expect(result?.parentId).toBe(parentId);
            expect(result?.childDef.type).toBe(TestType.dataset);
            expect(result?.childDef.id).toBe(`${parentId} with data set #0`);
        });

        it('should return undefined when already exists', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);
            await collection.change(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
            collection.resolveDataset(
                makeTestStarted(
                    `${parentId} with data set #0`,
                    'addition_provider with data set #0',
                ),
            );
            const result = collection.resolveDataset(
                makeTestStarted(
                    `${parentId} with data set #0`,
                    'addition_provider with data set #0',
                ),
            );

            expect(result).toBeUndefined();
        });

        it('should return undefined when parent not found', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);
            await collection.change(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const result = collection.resolveDataset(
                makeTestStarted('NonExistent::method with data set #0', 'method with data set #0'),
            );

            expect(result).toBeUndefined();
        });

        it('should return undefined for non-dataset test', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);
            await collection.change(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
            const result = collection.resolveDataset(
                makeTestStarted(parentId, 'addition_provider'),
            );

            expect(result).toBeUndefined();
        });
    });
});
