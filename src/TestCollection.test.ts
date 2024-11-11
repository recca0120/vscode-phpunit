import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { readFile } from 'node:fs/promises';
import { phpUnitProject } from './phpunit/__tests__/utils';
import { PHPUnitXML, Test, TestParser } from './phpunit';
import { TestCollection } from './TestCollection';


describe('vscode TestCollection', () => {
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
                const tests = testParser.parse(await readFile(uri.fsPath), uri.fsPath)!;
                map.set(uri.fsPath, tests);
            }
            expected.set(name, map);
        }

        expect(collection.items()).toEqual(expected);
    };

    it('add test', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`,
        );
        const includes: string[] = ['**/*.php'];
        const excludes: string[] = ['**/.git/**', '**/node_modules/**', '**/vendor/**'];

        const includePattern = new vscode.RelativePattern(workspaceFolder, `{${includes.join(',')}}`);
        const excludePattern = new vscode.RelativePattern(workspaceFolder, `{${excludes.join(',')}}`);
        const files = await vscode.workspace.findFiles(includePattern, excludePattern);

        for (const file of files) {
            await collection.add(file);
        }

        const skips = [
            'phpunit-stub/src/',
            'phpunit-stub\\src\\',
            'AbstractTest.php',
        ];

        await shouldBe(collection, {
            default: files.filter((file) => !skips.find((skip) => {
                return file.fsPath.indexOf(skip) !== -1;
            })),
        });
    });
});