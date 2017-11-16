import * as faker from 'faker';

import { Collection } from '../src/collection';
import { Type } from '../src/parsers/parser';
import { resolve as pathResolve } from 'path';

describe('Collection Test', () => {
    let items: any[] = [];

    beforeEach(() => {
        items = [];

        for (let i = 0; i < 10; i++) {
            items.push({
                name: faker.random.word(),
                class: faker.random.word(),
                classname: faker.random.word(),
                file: pathResolve(__dirname, faker.system.commonFileName('php', 'text')),
                line: faker.random.number(),
                time: faker.random.number(),
                type: faker.random.arrayElement([
                    Type.PASSED,
                    Type.ERROR,
                    Type.WARNING,
                    Type.FAILURE,
                    Type.INCOMPLETE,
                    Type.RISKY,
                    Type.SKIPPED,
                    Type.FAILED,
                ]),
                fault: {
                    type: faker.random.word(),
                    message: faker.lorem.text(),
                },
            });
        }
    });

    it('constructor', () => {
        const collection = new Collection(items);

        expect(collection.count()).toBe(items.length);
        expect(collection.length).toBe(items.length);
        expect(collection.values()).toEqual(items);
    });

    it('concat', () => {
        let collection = new Collection();
        collection = collection.concat(items);

        expect(collection.count()).toBe(items.length);
        expect(collection.length).toBe(items.length);
        expect(collection.values()).toEqual(items);
    });

    it('push', () => {
        const collection = new Collection();

        collection.push(items[0]);
        expect(collection.count()).toBe(1);
        expect(collection.length).toBe(1);
        expect(collection.values()).toEqual([items[0]]);
    });

    it('put', () => {
        const collection = new Collection();

        collection.put(items);
        expect(collection.count()).toBe(items.length);
        expect(collection.length).toBe(items.length);
        expect(collection.values()).toEqual(items);
    });

    it('has', () => {
        const collection = new Collection(items);

        expect(collection.has('name', items[0]['name'])).toBeTruthy();
    });

    it('has callback', () => {
        const collection = new Collection(items);

        expect(collection.has(item => item['name'] === items[0]['name'])).toBeTruthy();
    });

    it('where', () => {
        const collection = new Collection(items);

        expect(collection.where('name', items[0]['name'])).toEqual(new Collection([items[0]]));
    });

    it('where callback', () => {
        const collection = new Collection(items);

        expect(collection.where(item => item['name'] === items[0]['name'])).toEqual(new Collection([items[0]]));
    });

    it('first', () => {
        const collection = new Collection(items);

        expect(collection.first()).toEqual(items[0]);
    });

    it('filter', () => {
        const collection = new Collection(items);

        expect(collection.filter(item => item.type === Type.PASSED).values()).toEqual(
            items.filter(item => item.type === Type.PASSED)
        );
    });

    it('group by', () => {
        const collection = new Collection(items);

        collection.groupBy('type').forEach((results, type) => {
            expect(results.values()).toEqual(items.filter(item => item.type === type));
        });
    });
});
