import * as faker from 'faker';

import { TestCase, Type, TypeKeys } from '../src/parser';

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
                    type: faker.random.arrayElement(TypeKeys),
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

        const testCases1: TestCase[] = generatorRandomTestCases(10, {
            file: fileName1,
        });

        const testCases2: TestCase[] = generatorRandomTestCases(5, {
            file: fileName2,
        });

        const store: Store = new Store();
        store.put(testCases1).put(testCases2);

        const keys = Array.from(store.keys());

        keys.forEach(key => {
            expect(key).not.toMatch(/^\d{1, 1}:\\/);
        });
        expect(keys.length).toBe(2);
        expect(store.has(fileName1)).toBeTruthy();
        expect(store.get(fileName1)).toEqual(testCases1);
        expect(store.has(fileName2)).toBeTruthy();
        expect(store.get(fileName2)).toEqual(testCases2);
    });

    it('it should group by state', () => {
        const fileName = resolve(__dirname, faker.system.commonFileName('php', 'text'));
        const testCases: TestCase[] = generatorRandomTestCases(10, {
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
        store.put(testCases);

        const groupByType = store.getByType(fileName);

        expect(groupByType.get(Type.PASSED).length).toBe(10);
        expect(groupByType.get(Type.ERROR).length).toBe(5);
        expect(groupByType.get(Type.SKIPPED).length).toBe(8);
        expect(groupByType.get(Type.INCOMPLETE).length).toBe(6);
    });

    it('it should execute clear', () => {
        const store: Store = new Store();
        const testCases: TestCase[] = generatorRandomTestCases(10);
        store.put(testCases);
        expect(store.size).toBe(10);
        store.dispose();
        expect(store.size).toBe(0);
    });
});
