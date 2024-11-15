import 'jest';
import { RelativePattern, tests, Uri, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { PHPUnitXML, TestDefinition, TestParser } from './PHPUnit';
import { generateXML, phpUnitProject } from './PHPUnit/__tests__/utils';
import { Files, TestDefinitions } from './PHPUnit/TestCollection';
import { TestCollection } from './TestCollection';

const getTestController = () => {
    return (tests.createTestController as jest.Mock).mock.results[0].value;
};

describe('Extension TestCollection', () => {
    const root = phpUnitProject('');
    const workspaceFolder = { index: 0, name: 'phpunit', uri: Uri.file(root) };
    const ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
    const testParser = new TestParser();
    const phpUnitXML = new PHPUnitXML();

    const givenTestCollection = (text: string) => {
        phpUnitXML.load(generateXML(text), phpUnitProject('phpunit.xml'));

        return new TestCollection(ctrl, phpUnitXML, testParser);
    };

    const shouldBe = async (_collection: TestCollection, group: any) => {
        const expected = new Files<TestDefinition[]>;
        for (const [name, files] of Object.entries(group)) {
            const tests = new TestDefinitions<TestDefinition[]>();
            for (const uri of (files as URI[])) {
                tests.set(uri.fsPath, await testParser.parseFile(uri.fsPath) ?? []);
            }
            expected.set(name, tests);
        }

        // expect(_collection.items()).toEqual(expected);
    };

    beforeEach(() => jest.clearAllMocks());

    it('createTestItem', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`,
        );

        const files = [
            URI.file(phpUnitProject('tests/AssertionsTest.php')),
        ];

        for (const file of files) {
            await collection.add(file);
        }
    });

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