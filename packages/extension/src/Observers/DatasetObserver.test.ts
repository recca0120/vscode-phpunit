import {
    ChainAstParser,
    PHPUnitXML,
    PhpParserAstParser,
    type TestDefinition,
    TestIndex,
    TestParser,
    TestType,
    TreeSitterAstParser,
} from '@vscode-phpunit/phpunit';
import { generateXML, pestProject, phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { type TestController, type TestItem, tests } from 'vscode';
import { URI } from 'vscode-uri';
import { testStarted } from '../../test-support/teamcity';
import { TestTree } from '../TestTree/TestTree';
import { DatasetObserver } from './DatasetObserver';

describe('DatasetObserver', () => {
    let ctrl: TestController;
    let observer: DatasetObserver;
    let parentItem: TestItem;
    let testTree: TestTree;
    let testItemById: Map<string, TestItem>;

    beforeEach(async () => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');

        const phpUnitXML = new PHPUnitXML();
        phpUnitXML.load(
            generateXML(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`),
            phpUnitProject('phpunit.xml'),
        );

        const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
        const testParser = new TestParser(phpUnitXML, astParser);
        testTree = new TestTree(ctrl, phpUnitXML, new TestIndex(phpUnitXML, testParser));

        await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        const ns = ctrl.items.get('namespace:Tests') as TestItem;
        const classItem = ns.children.get('Assertions (Tests\\Assertions)') as TestItem;
        parentItem = classItem.children.get(
            'Assertions (Tests\\Assertions)::Addition provider',
        ) as TestItem;

        const queue = new Map<TestDefinition, TestItem>();
        queue.set(testTree.definitionOf(parentItem) as TestDefinition, parentItem);
        testItemById = new Map([...queue.values()].map((item) => [item.id, item]));
        observer = new DatasetObserver(testTree, testItemById);
    });

    it('should create child TestItem on testStarted with data set', () => {
        observer.testStarted(
            testStarted({
                id: parentItem.id,
                name: 'addition_provider with data set #0',
            }),
        );

        const childId = `${parentItem.id} with data set #0`;
        const child = parentItem.children.get(childId);
        expect(child).toBeDefined();
        expect(child?.label).toContain('with data set #0');

        const childDef = testTree.definitionOf(child as TestItem);
        expect(childDef).toBeDefined();
        expect(childDef?.type).toBe(TestType.dataset);

        expect(testItemById.has(childId)).toBe(true);
        expect(testItemById.get(childId)).toBe(child);
    });

    it('should create child TestItem for named data set', () => {
        observer.testStarted(
            testStarted({
                id: parentItem.id,
                name: 'addition_provider with data set "adding zeros"',
            }),
        );

        const childId = `${parentItem.id} with data set "adding zeros"`;
        const child = parentItem.children.get(childId);
        expect(child).toBeDefined();
    });

    it('should not create child for non-dataset results', () => {
        const sizeBefore = parentItem.children.size;

        observer.testStarted(
            testStarted({
                id: parentItem.id,
                name: 'addition_provider',
            }),
        );

        expect(parentItem.children.size).toBe(sizeBefore);
    });

    it('should reuse existing child on repeated runs', () => {
        const result = testStarted({
            id: parentItem.id,
            name: 'addition_provider with data set #0',
        });

        observer.testStarted(result);
        const child1 = parentItem.children.get(`${parentItem.id} with data set #0`);

        observer.testStarted(result);
        const child2 = parentItem.children.get(`${parentItem.id} with data set #0`);

        expect(child1).toBe(child2);
    });

    it('should skip when dataset child item already exists in testItemById', () => {
        const childId = `${parentItem.id} with data set #0`;
        const childItem = ctrl.createTestItem(childId, 'with data set #0');
        parentItem.children.add(childItem);
        testItemById.set(childId, childItem);

        const sizeBefore = testItemById.size;
        observer.testStarted(
            testStarted({
                id: childId,
                name: 'addition_provider with data set #0',
            }),
        );

        expect(testItemById.size).toBe(sizeBefore);
    });

    it('should add child to parent children collection', () => {
        observer.testStarted(
            testStarted({
                id: parentItem.id,
                name: 'addition_provider with data set #0',
            }),
        );

        const child = parentItem.children.get(`${parentItem.id} with data set #0`);
        expect(child).toBeDefined();
        expect(child?.label).toContain('with data set #0');
    });
});

describe('DatasetObserver (Pest)', () => {
    let ctrl: TestController;
    let observer: DatasetObserver;
    let parentItem: TestItem;
    let testTree: TestTree;
    let testItemById: Map<string, TestItem>;

    beforeEach(async () => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');

        const phpUnitXML = new PHPUnitXML();
        phpUnitXML.load(
            generateXML(`
                <testsuites>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                </testsuites>`),
            pestProject('phpunit.xml'),
        );

        const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
        const testParser = new TestParser(phpUnitXML, astParser);
        testTree = new TestTree(ctrl, phpUnitXML, new TestIndex(phpUnitXML, testParser));

        await testTree.add(URI.file(pestProject('tests/Unit/ExampleTest.php')));

        const ns = ctrl.items.get('namespace:Tests') as TestItem;
        const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
        const cls = unitNs.children.get('Tests\\Unit\\ExampleTest') as TestItem;
        parentItem = cls.children.get(
            "tests/Unit/ExampleTest.php::it has user's email",
        ) as TestItem;

        const queue = new Map<TestDefinition, TestItem>();
        queue.set(testTree.definitionOf(parentItem) as TestDefinition, parentItem);
        testItemById = new Map([...queue.values()].map((item) => [item.id, item]));
        observer = new DatasetObserver(testTree, testItemById);
    });

    it('should create dataset child with correct id and label', () => {
        observer.testStarted(
            testStarted({
                id: parentItem.id,
                name: `it has user's email with data set "('enunomaduro@gmail.com')"`,
            }),
        );

        const childId =
            `tests/Unit/ExampleTest.php::it has user's email` +
            ` with data set "('enunomaduro@gmail.com')"`;
        const child = parentItem.children.get(childId);
        expect(child).toBeDefined();
        expect(child?.id).toBe(childId);
        expect(child?.label).toContain("with ('enunomaduro@gmail.com')");

        const childDef = testTree.definitionOf(child as TestItem);
        expect(childDef).toBeDefined();
        expect(childDef?.type).toBe(TestType.dataset);
        expect(childDef?.id).toBe(childId);
        expect(childDef?.label).toBe("with ('enunomaduro@gmail.com')");

        expect(testItemById.has(childId)).toBe(true);
    });
});
