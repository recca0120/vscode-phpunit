import { expect } from '@jest/globals';
import { URI } from 'vscode-uri';
import { generateXML, phpUnitProject } from './__tests__/utils';
import { PHPUnitXML, TestDefinition, TestParser } from './index';
import { Files, TestCollection, TestDefinitions } from './TestCollection';


describe('TestCollection', () => {
    const testParser = new TestParser();
    const phpUnitXML = new PHPUnitXML();

    const givenTestCollection = (text: string) => {
        phpUnitXML.load(generateXML(text), phpUnitProject('phpunit.xml'));

        return new TestCollection(phpUnitXML, testParser);
    };

    const shouldBe = async (collection: TestCollection, group: any) => {
        const expected = new Files<TestDefinition[]>;
        for (const [name, files] of Object.entries(group)) {
            const testDefinitions = new TestDefinitions<TestDefinition[]>();
            for (const uri of (files as URI[])) {
                testDefinitions.set(uri.fsPath, await testParser.parseFile(uri.fsPath) ?? []);
            }
            expected.set(name, testDefinitions);
        }

        expect(collection.items()).toEqual(expected);
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
            URI.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];
        await Promise.all(files.map(async (file) => await collection.add(file)));

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
        await Promise.all(files.map(async (file) => await collection.add(file)));

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
        await Promise.all(files.map(async (file) => await collection.add(file)));

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
        await Promise.all(files.map(async (file) => await collection.add(file)));

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
        await Promise.all(files.map(async (file) => await collection.add(file)));

        await shouldBe(collection, {
            default: [files[0]],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Unit: [files[1]],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Feature: [files[2]],
        });
    });

    it('exclude no tests', async () => {
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
        await Promise.all(files.map(async (file) => await collection.add(file)));

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
        await Promise.all(files.map(async (file) => await collection.add(file)));

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
        await Promise.all(files.map(async (file) => await collection.add(file)));

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
        await Promise.all(files.map(async (file) => await collection.add(file)));
        expect(collection.items().size).toEqual(2);

        collection.reset();
        expect(collection.items().size).toEqual(0);
    });
});