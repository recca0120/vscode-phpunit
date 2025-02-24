import { URI } from 'vscode-uri';
import { generateXML, phpUnitProject } from '../__tests__/utils';
import { PHPUnitXML, TestDefinition, TestParser, TestType } from '../index';
import { TestCollection } from './TestCollection';

describe('TestCollection', () => {
    const phpUnitXML = new PHPUnitXML();
    const testCollection = new TestCollection(phpUnitXML);

    const givenTestCollection = (text: string) => {
        phpUnitXML.load(generateXML(text), phpUnitProject('phpunit.xml'));
        testCollection.reset();

        return testCollection;
    };

    const shouldBe = async (collection: TestCollection, testsuites: any) => {
        const phpUnitXML = new PHPUnitXML();
        phpUnitXML.setRoot(phpUnitProject(''));
        for (const [testsuite, files] of Object.entries(testsuites)) {
            const expected: TestDefinition[] = [];
            for (const uri of (files as URI[])) {
                const testParser = new TestParser(phpUnitXML);
                testParser.on(TestType.method, (testDefinition) => expected.push(testDefinition));
                testParser.on(TestType.class, (testDefinition) => expected.push(testDefinition));
                testParser.on(TestType.namespace, (testDefinition) => expected.push(testDefinition));

                await testParser.parseFile(uri.fsPath, testsuite);
            }
            const actual: TestDefinition[] = [];
            collection.items().get(testsuite)?.items().forEach((item) => actual.push(...item));
            expect(actual).toEqual(expected);
        }
    };

    it('match testsuite directory', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`,
        );

        const files = [
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            // URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.add(file);
        }

        await shouldBe(collection, { default: files });
    });

    it('match testsuite file', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <file>tests/AssertionsTest.php</file>
                </testsuite>
            </testsuites>`,
        );

        const files = [URI.file(phpUnitProject('tests/AssertionsTest.php'))];
        for (const file of files) {
            await collection.add(file);
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
            </testsuites>`,
        );

        const files = [
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.add(file);
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
            </testsuites>`,
        );

        const files = [
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.add(file);
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
            </testsuites>`,
        );

        const files = [
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Feature/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.add(file);
        }

        await shouldBe(collection, {
            default: [files[0]],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Unit: [files[1]],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Feature: [files[2]],
        });
    });

    it('match *', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests/*/SubFolder</directory>
                </testsuite> 
            </testsuites>`,
        );
        const files = [
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Unit/SubFolder/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Feature/SubFolder/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.add(file);
        }

        await shouldBe(collection, { default: [files[1], files[2]] });
    });

    it('match no case', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests/unit</directory>
                </testsuite> 
            </testsuites>`,
        );

        const files = [
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.add(file);
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
            </testsuites>`,
        );

        const files = [
            URI.file(phpUnitProject('tests/AbstractTest.php')),
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.add(file);
        }

        await shouldBe(collection, { default: [files[1], files[2]] });
    });

    it('unique file', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite> 
            </testsuites>`,
        );

        const files = [
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.add(file);
        }

        await shouldBe(collection, { default: [files[0]] });
    });

    it('delete file', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite> 
            </testsuites>`,
        );


        const files = [URI.file(phpUnitProject('tests/Unit/ExampleTest.php'))];
        for (const file of files) {
            await collection.add(file);
        }

        expect(collection.has(files[0])).toBeTruthy();
        expect(collection.delete(files[0])).toBeTruthy();
        expect(collection.delete(files[0])).toBeFalsy();
        await shouldBe(collection, { default: [] });
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
            </testsuites>`,
        );

        const files = [
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            URI.file(phpUnitProject('tests/Feature/ExampleTest.php')),
        ];
        for (const file of files) {
            await collection.add(file);
        }
        expect(collection.items().size).toEqual(2);

        collection.reset();
        expect(collection.size).toEqual(0);
    });
});