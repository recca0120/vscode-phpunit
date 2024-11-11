import { generateXML, phpUnitProject } from './__tests__/utils';
import { PHPUnitXML, Test, TestParser } from './index';
import { TestCollection } from './TestCollection';
import { Uri } from 'vscode';
import { readFile } from 'node:fs/promises';


describe('TestCollection', () => {
    const root = phpUnitProject('');
    const testParser = new TestParser();
    const phpUnitXML = new PHPUnitXML();

    const givenTestCollection = (text: string) => {
        phpUnitXML.load(generateXML(text));

        return new TestCollection(phpUnitXML, testParser, root);
    };

    const shouldBe = async (collection: TestCollection, group: any) => {
        const expected = new Map();
        for (const [name, files] of Object.entries(group)) {
            const map = new Map<string, Test[]>();
            for (const uri of (files as Uri[])) {
                map.set(uri.fsPath, testParser.parse(await readFile(uri.fsPath), uri.fsPath)!);
            }
            expected.set(name, map);
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
            Uri.file(phpUnitProject('tests/AssertionsTest.php')),
            Uri.file(phpUnitProject('tests/Unit/ExampleTest.php')),
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

        const files = [
            Uri.file(phpUnitProject('tests/AssertionsTest.php')),
        ];

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
            Uri.file(phpUnitProject('tests/AssertionsTest.php')),
            Uri.file(phpUnitProject('tests/Unit/ExampleTest.php')),
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
            Uri.file(phpUnitProject('tests/AssertionsTest.php')),
            Uri.file(phpUnitProject('tests/Unit/ExampleTest.php')),
        ];

        for (const file of files) {
            await collection.add(file);
        }

        await shouldBe(collection, { default: [files[0]] });
    });

    it('match two testsuites', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite> 
                <testsuite name="Unit">
                    <directory>tests/Unit</directory>
                </testsuite>
                <testsuite name="Feature">
                    <directory>tests/Feature</directory>
                </testsuite>
            </testsuites>`,
        );

        const files = [
            Uri.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            Uri.file(phpUnitProject('tests/Feature/ExampleTest.php')),
        ];

        for (const file of files) {
            await collection.add(file);
        }

        await shouldBe(collection, {
            default: files,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Unit: [files[0]],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Feature: [files[1]],
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
            Uri.file(phpUnitProject('tests/AbstractTest.php')),
            Uri.file(phpUnitProject('tests/AssertionsTest.php')),
            Uri.file(phpUnitProject('tests/Unit/ExampleTest.php')),
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
            Uri.file(phpUnitProject('tests/Unit/ExampleTest.php')),
            Uri.file(phpUnitProject('tests/Unit/ExampleTest.php')),
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

        const file = Uri.file(phpUnitProject('tests/Unit/ExampleTest.php'));

        await collection.add(file);
        expect(collection.has(file)).toBeTruthy();

        expect(collection.delete(file)).toBeTruthy();
        expect(collection.delete(file)).toBeFalsy();
        await shouldBe(collection, { default: [] });
    });
});