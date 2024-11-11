import { readFile } from 'node:fs/promises';
import { RelativePattern, Uri, workspace } from 'vscode';
import { PHPUnitXML, Test, TestParser } from './PHPUnit';
import { generateXML, phpUnitProject } from './PHPUnit/__tests__/utils';
import { TestCollection } from './TestCollection';


describe('vscode TestCollection', () => {
    const root = phpUnitProject('');
    const workspaceFolder = { index: 0, name: 'phpunit', uri: Uri.file(root) };
    const testParser = new TestParser();
    const phpUnitXML = new PHPUnitXML();

    const givenTestCollection = (text: string) => {
        phpUnitXML.load(generateXML(text), phpUnitProject('phpunit.xml'));

        return new TestCollection(phpUnitXML, testParser);
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

        const includePattern = new RelativePattern(workspaceFolder, `{${includes.join(',')}}`);
        const excludePattern = new RelativePattern(workspaceFolder, `{${excludes.join(',')}}`);
        const files = await workspace.findFiles(includePattern, excludePattern);

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