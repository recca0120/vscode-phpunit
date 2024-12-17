import { pestProject } from '../__tests__/utils';
import { PHPUnitXML } from '../PHPUnitXML';
import { TestParser } from './TestParser';
import { TestDefinition, TestType } from './types';

export const parse = (buffer: Buffer | string, file: string) => {
    const tests: TestDefinition[] = [];
    const phpUnitXML = new PHPUnitXML();
    phpUnitXML.setRoot(pestProject(''));
    const testParser = new TestParser(phpUnitXML);

    testParser.on(TestType.namespace, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.class, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.method, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.parse(buffer, file);

    return tests;
};

describe('PestParser', () => {
    const file = pestProject('tests/Fixtures/ExampleTest.php');

    const findTest = (tests: TestDefinition[], methodName: string) => {
        const lookup = {
            [TestType.method]: (test: TestDefinition) => test.methodName === methodName,
            [TestType.class]: (test: TestDefinition) => test.className === methodName && !test.methodName,
            [TestType.namespace]: (test: TestDefinition) => test.classFQN === methodName && !test.className && !test.methodName,
        } as { [key: string]: Function };

        for (const [, fn] of Object.entries(lookup)) {
            const test = tests.find((test: TestDefinition) => fn(test));

            if (test) {
                return test;
            }
        }

        return undefined;
    };

    const givenTest = (methodName: string, content: string, _file?: string) => {
        return findTest(parse(content, _file ?? file), methodName);
    };

    it('namespace:Tests\\Fixtures', async () => {
        const actual = givenTest('P\\Tests\\Fixtures', `
<?php 

test('example', function () {
    expect(true)->toBeTrue();
});
        `);

        expect(actual).toEqual(expect.objectContaining({
            type: TestType.namespace,
            id: 'namespace:Tests\\Fixtures',
            classFQN: 'P\\Tests\\Fixtures',
            namespace: 'P\\Tests\\Fixtures',
            label: 'Tests\\Fixtures',
            depth: 1,
        }));
    });

    it('ExampleTest', async () => {
        const actual = givenTest('ExampleTest', `
<?php 

test('example', function () {
    expect(true)->toBeTrue();
})

`);

        expect(actual).toEqual(expect.objectContaining({
            type: TestType.class,
            id: 'Tests\\Fixtures\\ExampleTest',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            label: 'ExampleTest',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 2,
        }));
    });

    it('example', async () => {
        const actual = givenTest('example', `
<?php 

test('example', function () {
    expect(true)->toBeTrue();
});
        `);

        expect(actual).toEqual({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::example',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: 'example',
            label: 'example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        });
    });

    it('it test example', async () => {
        const actual = givenTest('it test example', `
<?php

it('test example', function () {
    expect(true)->toBeTrue();
});
        `);

        expect(actual).toEqual({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::it test example',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: 'it test example',
            label: 'it test example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        });
    });

    it('`something` → example', async () => {
        const actual = givenTest('`something` → example', `
<?php

describe('something', function () {
    test('example', function () {
        expect(true)->toBeTrue();
    });
});
        `);

        expect(actual).toEqual({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::`something` → example',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`something` → example',
            label: 'something → example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        });
    });

    it('arrow function `something` → it example', async () => {
        const actual = givenTest('`something` → it example', `
<?php
describe('something', fn () => it('example', expect(true)->toBeTrue()));
        `);

        expect(actual).toEqual({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::`something` → it example',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`something` → it example',
            label: 'something → it example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        });
    });

    it('`something` → `something else` → it test example', async () => {
        const actual = givenTest('`something` → `something else` → it test example', `
<?php

describe('something', function () {
    describe('something else', function () {
        it('test example', function () {
            expect(true)->toBeTrue();
        });
    });
}); 
        `);

        expect(actual).toEqual({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::`something` → `something else` → it test example',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`something` → `something else` → it test example',
            label: 'something → something else → it test example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        });
    });

    it('it example 2', () => {
        const actual = givenTest('it example 2', `
<?php

it('example 2')->assertTrue(true);
        `);

        expect(actual).toEqual({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::it example 2',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: 'it example 2',
            label: 'it example 2',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        });
    });

    it('not test or test', async () => {
        const actual = givenTest('hello', `
<?php 

function hello(string $description,  callable $closure) {}

hello('hello', function () {
    expect(true)->toBeTrue();
});
        `);

        expect(actual).toBeUndefined();
    });
});