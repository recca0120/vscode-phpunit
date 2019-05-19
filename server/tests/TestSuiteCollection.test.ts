import files from '../src/Filesystem';
import { projectPath } from './helpers';
import { TestSuiteCollection } from '../src/TestSuiteCollection';
import { TextDocument } from 'vscode-languageserver-protocol';

describe('TestSuiteCollection', () => {
    const path = projectPath('');
    const suites = new TestSuiteCollection();
    const getLabelById = function(id: string) {
        return id;
    };

    it('instance', () => {
        expect(suites).toBeInstanceOf(TestSuiteCollection);
    });

    describe('all', () => {
        let items: any[];

        beforeAll(async () => {
            items = (await suites.load(path)).all().map(suite => {
                return {
                    id: suite.id,
                    label: suite.label,
                };
            });
        });

        it('Recca0120\\VSCode\\Tests\\AssertionsTest', () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
            const label = getLabelById(id);

            expect(items.find(item => item.id === id)).toEqual({
                id,
                label,
            });
        });

        it('Recca0120\\VSCode\\Tests\\CalculatorTest', () => {
            const id = 'Recca0120\\VSCode\\Tests\\CalculatorTest';
            const label = getLabelById(id);

            expect(items.find(item => item.id === id)).toEqual({
                id,
                label,
            });
        });

        it('Recca0120\\VSCode\\Tests\\Directory\\HasPropertyTest', () => {
            const id = 'Recca0120\\VSCode\\Tests\\Directory\\HasPropertyTest';
            const label = getLabelById(id);

            expect(items.find(item => item.id === id)).toEqual({
                id,
                label,
            });
        });

        it('Recca0120\\VSCode\\Tests\\Directory\\LeadingCommentsTest', () => {
            const id =
                'Recca0120\\VSCode\\Tests\\Directory\\LeadingCommentsTest';
            const label = getLabelById(id);

            expect(items.find(item => item.id === id)).toEqual({
                id,
                label,
            });
        });
    });

    it('get', async () => {
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const label = getLabelById(id);

        expect(
            await suites.get(projectPath('tests/AssertionsTest.php'))
        ).toEqual(
            jasmine.objectContaining({
                id,
                label,
            })
        );
    });

    it('put text document', async () => {
        const file = projectPath('tests/AssertionsTest.php');
        const textDocument = TextDocument.create(
            'foo.php',
            'php',
            0,
            await files.get(file)
        );

        suites.putTextDocument(textDocument);

        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const label = getLabelById(id);

        expect(await suites.get(file)).toEqual(
            jasmine.objectContaining({
                id,
                label,
            })
        );
    });

    it('find test suite', async () => {
        await suites.load(path);
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const test = suites.find(id);

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
            })
        );
    });

    it('find test', async () => {
        await suites.load(path);
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed';

        const test = suites.find(id);

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
            })
        );
    });

    it('where test', async () => {
        await suites.load(path);
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed';

        const tests = suites.where(test => {
            return test.id === id;
        });

        expect(tests[0]).toEqual(
            jasmine.objectContaining({
                id: id,
            })
        );
    });
});
