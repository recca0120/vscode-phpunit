import { pestProject } from '../__tests__/utils';
import { PHPUnitXML } from '../PHPUnitXML';
import { TestParser } from './TestParser';
import { TestDefinition, TestType } from './types';

export const parse = (buffer: Buffer | string, file: string) => {
    const tests: TestDefinition[] = [];
    const phpUnitXML = new PHPUnitXML();
    phpUnitXML.setRoot(pestProject(''));
    const testParser = new TestParser(phpUnitXML);

    testParser.on(TestType.method, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.class, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.parse(buffer, file);

    return tests;
};

describe('PestParser', () => {
    const file = pestProject('tests/Unit/ExampleTest.php');

    const findTest = (tests: TestDefinition[], methodName: string) => {
        const test = tests.find((test: any) => test.methodName === methodName);

        if (test) {
            return test;
        }

        return tests.find((test: any) => test.className === methodName && !test.methodName);
    };

    const givenTest = (methodName: string, content: string, _file?: string) => {
        return findTest(parse(content, _file ?? file), methodName);
    };

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

    it('ExampleTest', async () => {
        const actual = givenTest('ExampleTest', `
<?php 

test('example', function () {
    expect(true)->toBeTrue();
})

`);

        expect(actual).toEqual(expect.objectContaining({
            type: TestType.class,
            id: 'P\\Tests\\Unit\\ExampleTest',
            classFQN: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            className: 'ExampleTest',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
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
            id: 'P\\Tests\\Unit\\ExampleTest::example',
            classFQN: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            className: 'ExampleTest',
            methodName: 'example',
            label: 'example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
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
            id: 'P\\Tests\\Unit\\ExampleTest::it test example',
            classFQN: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            className: 'ExampleTest',
            methodName: 'it test example',
            label: 'it test example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
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
            id: 'P\\Tests\\Unit\\ExampleTest::`something` → example',
            classFQN: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            className: 'ExampleTest',
            methodName: '`something` → example',
            label: 'something → example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
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
            id: 'P\\Tests\\Unit\\ExampleTest::`something` → `something else` → it test example',
            classFQN: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            className: 'ExampleTest',
            methodName: '`something` → `something else` → it test example',
            label: 'something → something else → it test example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
        });
    });

    it('it example 2', () => {
        const actual = givenTest('it example 2', `
<?php

it('example 2')->assertTrue(true);
        `);

        expect(actual).toEqual({
            type: TestType.method,
            id: 'P\\Tests\\Unit\\ExampleTest::it example 2',
            classFQN: 'P\\Tests\\Unit\\ExampleTest',
            namespace: 'P\\Tests\\Unit',
            className: 'ExampleTest',
            methodName: 'it example 2',
            label: 'it example 2',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
        });
    });
});