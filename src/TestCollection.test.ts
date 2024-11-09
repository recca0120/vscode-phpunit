import { phpUnitProject } from './phpunit/__tests__/utils';
import { PHPUnitXML } from './phpunit';
import { TestCollection } from './TestCollection';
import * as vscode from 'vscode';
import { Uri } from 'vscode';


describe('TestCollection', () => {
    const generateXML = (text: string) => {
        return `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
>
    ${text.trim()}
</phpunit>`;
    };

    const root = phpUnitProject('');
    const workspaceFolder = { index: 0, name: 'phpunit', uri: vscode.Uri.file(root) };

    function givenTestCollection(text: string) {
        const phpUnitXML = new PHPUnitXML(generateXML(text));

        return new TestCollection(root, phpUnitXML);
    }

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

        files.forEach((file) => collection.add(file));

        expect(collection.items()).toEqual({ default: files });
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

        files.forEach((file) => collection.add(file));

        expect(collection.items()).toEqual({ default: files });
    });

    it('match testsuite exclude directory', () => {
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

        files.forEach((file) => collection.add(file));

        expect(collection.items()).toEqual({ default: [files[0]] });
    });

    it('match testsuite exclude file', () => {
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

        files.forEach((file) => collection.add(file));

        expect(collection.items()).toEqual({ default: [files[0]] });
    });

    it('match two testsuites', () => {
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

        files.forEach((file) => collection.add(file));

        expect(collection.items()).toEqual({
            'default': files,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Unit': [files[0]],
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Feature': [files[1]],
        });
    });

    it('add test', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`,
        );
        const includes: string[] = ['tests/**/*.php'];
        const excludes: string[] = ['**/.git/**', '**/node_modules/**', '**/vendor/**'];

        const includePattern = new vscode.RelativePattern(workspaceFolder, `{${includes.join(',')}}`);
        const excludePattern = new vscode.RelativePattern(workspaceFolder, `{${excludes.join(',')}}`);
        const files = await vscode.workspace.findFiles(includePattern, excludePattern);
        files.forEach(file => collection.add(file));

        expect(collection.items()).toEqual({ default: files });
    });
});