import { TestItem, TestItemCollection, TestRunRequest } from 'vscode';
import { TestType } from './PHPUnit';
import { TestCase, TestCollection } from './TestCollection';
import { TestQueueBuilder } from './TestQueueBuilder';

const createTestItem = (id: string, children: TestItem[] = []): TestItem => {
    const childCollection = {
        forEach: (cb: (item: TestItem) => void) => children.forEach(cb),
    } as TestItemCollection;

    return { id, children: childCollection } as TestItem;
};

describe('TestQueueBuilder', () => {
    let testCollection: TestCollection;
    let queueBuilder: TestQueueBuilder;

    beforeEach(() => {
        testCollection = { getTestCase: vi.fn() } as unknown as TestCollection;
        queueBuilder = new TestQueueBuilder(testCollection);
    });

    it('should discover method test items', async () => {
        const testItem = createTestItem('test1');
        const testCase = { type: TestType.method } as TestCase;
        (testCollection.getTestCase as import('vitest').Mock).mockReturnValue(testCase);

        const request = {} as TestRunRequest;
        const queue = await queueBuilder.build([testItem], request);

        expect(queue.size).toBe(1);
        expect(queue.get(testCase)).toBe(testItem);
    });

    it('should recurse into non-method items', async () => {
        const childItem = createTestItem('child');
        const parentItem = createTestItem('parent', [childItem]);

        const childCase = { type: TestType.method } as TestCase;
        (testCollection.getTestCase as import('vitest').Mock)
            .mockReturnValueOnce({ type: TestType.class })
            .mockReturnValueOnce(childCase);

        const request = {} as TestRunRequest;
        const queue = await queueBuilder.build([parentItem], request);

        expect(queue.size).toBe(1);
        expect(queue.get(childCase)).toBe(childItem);
    });

    it('should skip excluded items', async () => {
        const testItem = createTestItem('excluded');
        const request = { exclude: [testItem] } as unknown as TestRunRequest;

        const queue = await queueBuilder.build([testItem], request);

        expect(queue.size).toBe(0);
    });

    it('should gather test items from a collection', () => {
        const items = [createTestItem('a'), createTestItem('b')];
        const collection = {
            forEach: (cb: (item: TestItem) => void) => items.forEach(cb),
        } as TestItemCollection;

        expect(queueBuilder.collectItems(collection)).toEqual(items);
    });
});
