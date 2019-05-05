import { TestSuiteCollection } from '../src/TestSuiteCollection';
import { projectPath } from './helpers';

describe('TestSuiteCollection', () => {
    const path = projectPath('');
    const collection = new TestSuiteCollection();

    it('instance', () => {
        expect(collection).toBeInstanceOf(TestSuiteCollection);
    });

    it('all', async () => {
        expect(
            Array.from((await collection.load(path)).all().values()).map(
                suite => ({
                    id: suite.id,
                    label: suite.label,
                })
            )
        ).toEqual([
            jasmine.objectContaining({
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                label: 'AssertionsTest',
            }),
            jasmine.objectContaining({
                id: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
                label: 'CalculatorTest',
            }),
            jasmine.objectContaining({
                id: 'Recca0120\\VSCode\\Tests\\Directory\\HasPropertyTest',
                label: 'HasPropertyTest',
            }),
            jasmine.objectContaining({
                id: 'Recca0120\\VSCode\\Tests\\Directory\\LeadingCommentsTest',
                label: 'LeadingCommentsTest',
            }),
        ]);
    });

    it('get', async () => {
        expect(
            await collection.get(projectPath('tests/AssertionsTest.php'))
        ).toEqual(
            jasmine.objectContaining({
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                label: 'AssertionsTest',
            })
        );
    });
});
