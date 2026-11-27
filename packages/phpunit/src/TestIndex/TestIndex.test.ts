import { beforeAll, describe, expect, it } from 'vitest';
import { URI } from 'vscode-uri';
import { phpUnitProject } from '../../tests/support/fixtures';
import { generateXML } from '../../tests/support/phpUnitXml';
import { PhpParserAstParser } from '../Interpreter/AstParser/PhpParser/PhpParserAstParser';
import { TreeSitterAstParser } from '../Interpreter/AstParser/TreeSitter/TreeSitterAstParser';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
import { ChainAstParser, PHPUnitXML, type TestDefinition, TestParser, TestType } from '../index';
import { TeamcityEvent, type TestStarted } from '../TestOutput';
import { ClassRegistry } from './ClassRegistry';
import { InheritanceResolver } from './InheritanceResolver';
import { TestIndex } from './TestIndex';

beforeAll(async () => initTreeSitter());

describe('TestIndex', () => {
    const phpUnitXML = new PHPUnitXML();
    const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
    const testParser = new TestParser(phpUnitXML, astParser);
    const testIndex = new TestIndex(phpUnitXML, testParser);

    const givenTestIndex = (text: string) => {
        phpUnitXML.load(generateXML(text), phpUnitProject('phpunit.xml'));
        testIndex.clear();

        return testIndex;
    };

    const shouldBe = async (
        testIndex: TestIndex,
        testsuites: Record<string, import('vscode-uri').URI[]>,
    ) => {
        const phpUnitXML = new PHPUnitXML();
        phpUnitXML.setRoot(phpUnitProject(''));
        const registry = new ClassRegistry();
        const inheritance = new InheritanceResolver(registry);
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
                        registry.register(cls);
                    }
                    expected.push(...inheritance.resolve(result.tests));
                }
            }
            const actual: TestDefinition[] = [];
            for (const file of testIndex.files()) {
                if (file.testsuite === testsuite) {
                    actual.push(...file.tests);
                }
            }
            expect(actual).toEqual(expected);
        }
    };

    it('clear forgets an indexed file', async () => {
        const testIndex = givenTestIndex(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const uri = URI.file(phpUnitProject('tests/AssertionsTest.php'));
        await testIndex.update(uri);
        expect(testIndex.has(uri)).toBe(true);

        testIndex.clear();
        expect(testIndex.has(uri)).toBe(false);
    });

    it('keeps the class registry in TestIndex, not in TestParser', () => {
        expect(Object.values(testParser).some((value) => value instanceof ClassRegistry)).toBe(
            false,
        );
    });

    describe('testsuites from phpunit.xml', () => {
        it('match testsuite directory', async () => {
            const testIndex = givenTestIndex(`
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
                await testIndex.update(file);
            }

            await shouldBe(testIndex, { default: files });
        });

        it('match testsuite file', async () => {
            const testIndex = givenTestIndex(`
                <testsuites>
                    <testsuite name="default">
                        <file>tests/AssertionsTest.php</file>
                    </testsuite>
                </testsuites>`);

            const files = [URI.file(phpUnitProject('tests/AssertionsTest.php'))];
            for (const file of files) {
                await testIndex.update(file);
            }

            await shouldBe(testIndex, { default: files });
        });

        it('match testsuite exclude directory', async () => {
            const testIndex = givenTestIndex(`
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
                await testIndex.update(file);
            }

            await shouldBe(testIndex, { default: [files[0]] });
        });

        it('match testsuite exclude file', async () => {
            const testIndex = givenTestIndex(`
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
                await testIndex.update(file);
            }

            await shouldBe(testIndex, { default: [files[0]] });
        });

        it('match three testsuites', async () => {
            const testIndex = givenTestIndex(`
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
                await testIndex.update(file);
            }

            await shouldBe(testIndex, {
                default: [files[0]],
                Unit: [files[1]],
                Feature: [files[2]],
            });
        });

        it('match *', async () => {
            const testIndex = givenTestIndex(`
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
                await testIndex.update(file);
            }

            await shouldBe(testIndex, { default: [files[1], files[2]] });
        });

        it('match no case', async () => {
            const testIndex = givenTestIndex(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests/unit</directory>
                    </testsuite> 
                </testsuites>`);

            const files = [URI.file(phpUnitProject('tests/Unit/ExampleTest.php'))];
            for (const file of files) {
                await testIndex.update(file);
            }

            await shouldBe(testIndex, {
                default: [files[0]],
            });
        });
    });

    it('exclude abstract class', async () => {
        const testIndex = givenTestIndex(`
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
            await testIndex.update(file);
        }

        await shouldBe(testIndex, { default: [files[1], files[2]] });
    });

    it('unique file', async () => {
        const testIndex = givenTestIndex(`
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
            await testIndex.update(file);
        }

        await shouldBe(testIndex, { default: [files[0]] });
    });

    it('remove file', async () => {
        const testIndex = givenTestIndex(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite> 
            </testsuites>`);

        const files = [URI.file(phpUnitProject('tests/Unit/ExampleTest.php'))];
        for (const file of files) {
            await testIndex.update(file);
        }

        expect(testIndex.has(files[0])).toBeTruthy();
        expect((await testIndex.remove(files[0])).deleted[0]).toBeDefined();
        expect((await testIndex.remove(files[0])).deleted[0]).toBeUndefined();
        await shouldBe(testIndex, { default: [] });
    });

    it('removing a folder keeps a sibling file whose name starts with the folder name', async () => {
        const testIndex = givenTestIndex(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const sibling = URI.file(phpUnitProject('tests/AssertionsTest.php'));
        await testIndex.update(sibling);

        const { deleted } = await testIndex.remove(URI.file(phpUnitProject('tests/Assertions')));

        expect(deleted).toEqual([]);
        expect(testIndex.has(sibling)).toBe(true);
    });

    it('change should remove file when it no longer contains tests', async () => {
        const testIndex = givenTestIndex(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const abstractFile = URI.file(phpUnitProject('tests/AbstractTest.php'));

        await testIndex.update(abstractFile);
        expect(testIndex.has(abstractFile)).toBeFalsy();
    });

    it('remove should clear definitionIndex so addDatasetChild works again', async () => {
        const testIndex = givenTestIndex(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const uri = URI.file(phpUnitProject('tests/AssertionsTest.php'));
        await testIndex.update(uri);

        const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
        const started = makeTestStarted(
            `${parentId} with data set #0`,
            'addition_provider with data set #0',
        );

        expect(testIndex.addDatasetChild(started)).toBeDefined();
        expect(testIndex.addDatasetChild(started)).toBeUndefined();

        await testIndex.remove(uri);
        await testIndex.update(uri);

        expect(testIndex.addDatasetChild(started)).toBeDefined();
    });

    it('clear should clear definitionIndex so addDatasetChild works again', async () => {
        const testIndex = givenTestIndex(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const uri = URI.file(phpUnitProject('tests/AssertionsTest.php'));
        await testIndex.update(uri);

        const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
        const started = makeTestStarted(
            `${parentId} with data set #0`,
            'addition_provider with data set #0',
        );

        expect(testIndex.addDatasetChild(started)).toBeDefined();
        expect(testIndex.addDatasetChild(started)).toBeUndefined();

        testIndex.clear();
        await testIndex.update(uri);

        expect(testIndex.addDatasetChild(started)).toBeDefined();
    });

    it('clear empties an index of several testsuites', async () => {
        const testIndex = givenTestIndex(`
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
            await testIndex.update(file);
        }
        expect(testIndex.size).toEqual(2);

        testIndex.clear();
        expect(testIndex.size).toEqual(0);
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
            const testIndex = givenTestIndex(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);
            await testIndex.update(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
            const result = testIndex.addDatasetChild(
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
            const testIndex = givenTestIndex(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);
            await testIndex.update(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
            testIndex.addDatasetChild(
                makeTestStarted(
                    `${parentId} with data set #0`,
                    'addition_provider with data set #0',
                ),
            );
            const result = testIndex.addDatasetChild(
                makeTestStarted(
                    `${parentId} with data set #0`,
                    'addition_provider with data set #0',
                ),
            );

            expect(result).toBeUndefined();
        });

        it('should return undefined when parent not found', async () => {
            const testIndex = givenTestIndex(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);
            await testIndex.update(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const result = testIndex.addDatasetChild(
                makeTestStarted('NonExistent::method with data set #0', 'method with data set #0'),
            );

            expect(result).toBeUndefined();
        });

        it('should return undefined for non-dataset test', async () => {
            const testIndex = givenTestIndex(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);
            await testIndex.update(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const parentId = 'Assertions (Tests\\Assertions)::Addition provider';
            const result = testIndex.addDatasetChild(
                makeTestStarted(parentId, 'addition_provider'),
            );

            expect(result).toBeUndefined();
        });
    });
});
