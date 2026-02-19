import { beforeAll, describe, expect, it } from 'vitest';
import { URI } from 'vscode-uri';
import { generateXML, phpUnitProject } from '../__tests__/utils';
import { ChainAstParser, PHPUnitXML, type TestDefinition, TestParser } from '../index';
import { ClassHierarchy } from '../TestParser/ClassHierarchy';
import { PhpParserAstParser } from '../TestParser/php-parser/PhpParserAstParser';
import { TreeSitterAstParser } from '../TestParser/tree-sitter/TreeSitterAstParser';
import { initTreeSitter } from '../TestParser/tree-sitter/TreeSitterParser';
import { TestCollection } from './TestCollection';

beforeAll(async () => initTreeSitter());

describe('TestCollection', () => {
    const phpUnitXML = new PHPUnitXML();
    const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
    const classHierarchy = new ClassHierarchy();
    const testParser = new TestParser(phpUnitXML, astParser);
    const testCollection = new TestCollection(phpUnitXML, testParser, classHierarchy);

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

    it('should own classHierarchy and clear on reset', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        await collection.change(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        // ClassHierarchy should have entries after parsing
        expect(classHierarchy.get('Tests\\AssertionsTest')).toBeDefined();

        // reset should clear classHierarchy
        collection.reset();
        expect(classHierarchy.get('Tests\\AssertionsTest')).toBeUndefined();
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
});
