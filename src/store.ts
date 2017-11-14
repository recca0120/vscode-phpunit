import { TestCase, Type, TypeGroup, TypeKeys } from './parsers/parser';

import { normalizePath } from './helpers';

export class Store extends Map<string, TestCase[]> {
    constructor(testCases: TestCase[] = [], items: Map<string, TestCase[]> = new Map<string, TestCase[]>()) {
        super(items);
        this.put(testCases);
    }

    put(testCases: TestCase[]): this {
        this.groupByFile(testCases).forEach((testCases: TestCase[], fileName: string) => {
            this.set(
                normalizePath(fileName),
                testCases.map((testCase: TestCase) => {
                    return Object.assign(testCase, {
                        type: TypeGroup.get(testCase.type),
                    });
                })
            );
        });

        return this;
    }

    has(fileName: string): boolean {
        return super.has(normalizePath(fileName));
    }

    get(fileName: string): TestCase[] {
        return super.get(normalizePath(fileName));
    }

    getByType(fileName: string): Map<Type, TestCase[]> {
        return this.groupByType(this.get(fileName));
    }

    dispose(): void {
        this.clear();
    }

    private groupByFile(testCases: TestCase[]): Map<string, TestCase[]> {
        return testCases.reduce((testCasesGroup: Map<string, TestCase[]>, testCase: TestCase) => {
            let group = [];
            if (testCasesGroup.has(testCase.file) === true) {
                group = testCasesGroup.get(testCase.file);
            }

            return testCasesGroup.set(testCase.file, group.concat(testCase));
        }, new Map<string, TestCase[]>());
    }

    private groupByType(testCases: TestCase[]): Map<Type, TestCase[]> {
        return testCases.reduce(
            (testCasesGroup: Map<Type, TestCase[]>, testCase: TestCase) =>
                testCasesGroup.set(testCase.type, testCasesGroup.get(testCase.type).concat(testCase)),
            new Map<Type, TestCase[]>([].concat(TypeKeys.map(type => [type, []])))
        );
    }
}
