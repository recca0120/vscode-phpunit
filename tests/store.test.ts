import * as faker from 'faker';

import { TestCase, Type } from '../src/parsers/parser';

import { Store } from '../src/store';
import { resolve } from 'path';

function generatorRandomTestCases(num = 10, options: any = {}): TestCase[] {
    const testCases: TestCase[] = [];

    for (let i = 0; i < num; i++) {
        testCases.push(
            Object.assign(
                {
                    name: faker.random.word(),
                    class: faker.random.word(),
                    classname: faker.random.word(),
                    file: resolve(__dirname, faker.system.commonFileName('php', 'text')),
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
                },
                options
            )
        );
    }

    return testCases;
}

describe('Store Tests', () => {
    it('it should group by file name', () => {
        const fileName1: string = resolve(__dirname, faker.system.commonFileName('php', 'text'));
        const fileName2: string = resolve(__dirname, faker.system.commonFileName('php', 'text'));

        const items1: TestCase[] = generatorRandomTestCases(10, {
            file: fileName1,
        });

        const items2: TestCase[] = generatorRandomTestCases(5, {
            file: fileName2,
        });

        const store: Store = new Store();
        store.put(items1).put(items2);

        const keys = Array.from(Array.from(store.groupBy('file').keys()));
        keys.forEach(key => {
            expect(key).not.toMatch(/^\d{1, 1}:\\/);
        });
        expect(keys.length).toBe(2);
        expect(store.count()).toBe(15);
        expect(store.has(fileName1)).toBeTruthy();
        expect(store.get(fileName1).all()).toEqual(items1);
        expect(store.has(fileName2)).toBeTruthy();
        expect(store.get(fileName2).all()).toEqual(items2);
    });

    it('it should group by state', () => {
        const fileName = resolve(__dirname, faker.system.commonFileName('php', 'text'));
        const items: TestCase[] = generatorRandomTestCases(10, {
            file: fileName,
            type: Type.PASSED,
        })
            .concat(
                generatorRandomTestCases(5, {
                    file: fileName,
                    type: Type.ERROR,
                })
            )
            .concat(
                generatorRandomTestCases(8, {
                    file: fileName,
                    type: Type.SKIPPED,
                })
            )
            .concat(
                generatorRandomTestCases(6, {
                    file: fileName,
                    type: Type.INCOMPLETE,
                })
            );

        const store: Store = new Store();
        store.put(items);

        const groupByType = store.get(fileName).groupBy('type');

        expect(groupByType.get(Type.PASSED).count()).toBe(10);
        expect(groupByType.get(Type.ERROR).count()).toBe(5);
        expect(groupByType.get(Type.SKIPPED).count()).toBe(8);
        expect(groupByType.get(Type.INCOMPLETE).count()).toBe(6);
    });

    it('it should execute clear', () => {
        const store: Store = new Store();
        const items: TestCase[] = generatorRandomTestCases(10);
        store.put(items);
        expect(store.count()).toBe(10);
        store.dispose();
        expect(store.count()).toBe(0);
    });
});
