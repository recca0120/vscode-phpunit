import { Collection } from '../src/collection';
import { Type } from '../src/parsers/parser';
import { generateRandomTestCase } from './helpers';

describe('Collection Test', () => {
    it('constructor', () => {
        const items = generateRandomTestCase();
        const collection = new Collection(items);

        expect(collection.count()).toBe(items.length);
        expect(collection.length).toBe(items.length);
        expect(collection.values()).toEqual(items);
    });

    it('concat', () => {
        const items = generateRandomTestCase();
        let collection = new Collection();
        collection = collection.concat(items);

        expect(collection.count()).toBe(items.length);
        expect(collection.length).toBe(items.length);
        expect(collection.values()).toEqual(items);
    });

    it('push', () => {
        const items = generateRandomTestCase();
        const collection = new Collection();

        collection.push(items[0]);
        expect(collection.count()).toBe(1);
        expect(collection.length).toBe(1);
        expect(collection.values()).toEqual([items[0]]);
    });

    it('put', () => {
        const items = generateRandomTestCase();
        const collection = new Collection();

        collection.put(items);
        expect(collection.count()).toBe(items.length);
        expect(collection.length).toBe(items.length);
        expect(collection.values()).toEqual(items);
    });

    it('has', () => {
        const items = generateRandomTestCase();
        const collection = new Collection(items);

        expect(collection.has('name', items[0]['name'])).toBeTruthy();
    });

    it('has callback', () => {
        const items = generateRandomTestCase();
        const collection = new Collection(items);

        expect(collection.has(item => item['name'] === items[0]['name'])).toBeTruthy();
    });

    it('where', () => {
        const items = generateRandomTestCase();
        const collection = new Collection(items);

        expect(collection.where('name', items[0]['name'])).toEqual(new Collection([items[0]]));
    });

    it('where callback', () => {
        const items = generateRandomTestCase();
        const collection = new Collection(items);

        expect(collection.where(item => item['name'] === items[0]['name'])).toEqual(new Collection([items[0]]));
    });

    it('first', () => {
        const items = generateRandomTestCase();
        const collection = new Collection(items);

        expect(collection.first()).toEqual(items[0]);
    });

    it('filter', () => {
        const items = generateRandomTestCase();
        const collection = new Collection(items);

        expect(collection.filter(item => item.type === Type.PASSED).values()).toEqual(
            items.filter(item => item.type === Type.PASSED)
        );
    });

    it('group by', () => {
        const items = generateRandomTestCase();
        const collection = new Collection(items);

        collection.groupBy('type').forEach((results, type) => {
            expect(results.values()).toEqual(items.filter(item => item.type === type));
        });
    });
});
