import { expect } from '@jest/globals';
import { pestProject } from '../__tests__/utils';
import { PHPUnitXML } from '../PHPUnitXML';
import { TestDefinition, TestType } from '../types';
import { TestParser } from './TestParser';

export const parse = (buffer: Buffer | string, file: string) => {
    const tests: TestDefinition[] = [];
    const phpUnitXML = new PHPUnitXML();
    phpUnitXML.setRoot(pestProject(''));
    const testParser = new TestParser(phpUnitXML);

    testParser.on(TestType.namespace, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.class, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.describe, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.on(TestType.method, (testDefinition: TestDefinition) => tests.push(testDefinition));
    testParser.parse(buffer, file);

    return tests;
};

describe('PestParser', () => {
    const findTest = (tests: TestDefinition[], id: string) => {
        const lookup = {
            [TestType.method]: (test: TestDefinition) => test.methodName === id,
            [TestType.describe]: (test: TestDefinition) => test.methodName === id,
            [TestType.class]: (test: TestDefinition) => test.className === id && !test.methodName,
            [TestType.namespace]: (test: TestDefinition) => test.classFQN === id && !test.className && !test.methodName,
        } as { [key: string]: Function };

        for (const [, fn] of Object.entries(lookup)) {
            const test = tests.find((test: TestDefinition) => fn(test));

            if (test) {
                return test;
            }
        }

        return undefined;
    };

    const givenTest = (file: string, content: string, id: string) => {
        return findTest(parse(content, file), id);
    };

    const file = pestProject('tests/Fixtures/ExampleTest.php');

    it('namespace:Tests\\Fixtures', async () => {
        const content = `<?php 

test('example', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'P\\Tests\\Fixtures')).toEqual(expect.objectContaining({
            type: TestType.namespace,
            id: 'namespace:Tests\\Fixtures',
            classFQN: 'P\\Tests\\Fixtures',
            namespace: 'P\\Tests\\Fixtures',
            label: 'Tests\\Fixtures',
            depth: 0,
        }));
    });

    it('ExampleTest', async () => {
        const content = `<?php 

test('example', function () {
    expect(true)->toBeTrue();
})
`;
        expect(givenTest(file, content, 'ExampleTest')).toEqual(expect.objectContaining({
            type: TestType.class,
            id: 'Tests\\Fixtures\\ExampleTest',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            label: 'ExampleTest',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 1,
        }));
    });

    it('example', async () => {
        const content = `<?php 

test('example', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'example')).toEqual(expect.objectContaining({
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
            depth: 2,
        }));
    });

    it('it test example', async () => {
        const content = `<?php

it('test example', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'it test example')).toEqual(expect.objectContaining({
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
            depth: 2,
        }));
    });

    it('`something` → example', async () => {
        const content = `<?php

describe('something', function () {
    test('example', function () {
        expect(true)->toBeTrue();
    });
});
        `;

        expect(givenTest(file, content, '`something`')).toEqual(expect.objectContaining({
            type: TestType.describe,
            id: 'tests/Fixtures/ExampleTest.php::`something`',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`something`',
            label: 'something',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 2,
        }));

        expect(givenTest(file, content, '`something` → example')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::`something` → example',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`something` → example',
            label: 'example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        }));
    });

    it('arrow function `something` → it example', async () => {
        const content = `<?php
        
describe('something', fn () => it('example', fn() => expect(true)->toBeTrue()));

        `;

        expect(givenTest(file, content, '`something` → it example')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::`something` → it example',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`something` → it example',
            label: 'it example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        }));
    });

    it('`something` → `something else` → it test example', async () => {
        const content = `<?php

describe('something', function () {
    describe('something else', function () {
        it('test example', function () {
            expect(true)->toBeTrue();
        });
    });
}); 
        `;

        expect(givenTest(file, content, '`something` → `something else`')).toEqual(expect.objectContaining({
            type: TestType.describe,
            id: 'tests/Fixtures/ExampleTest.php::`something` → `something else`',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`something` → `something else`',
            label: 'something else',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        }));

        expect(givenTest(file, content, '`something` → `something else` → it test example')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::`something` → `something else` → it test example',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`something` → `something else` → it test example',
            label: 'it test example',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 4,
        }));
    });

    it('it example 2', () => {
        const content = `<?php

it('example 2')->assertTrue(true);
        `;

        expect(givenTest(file, content, 'it example 2')).toEqual(expect.objectContaining({
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
            depth: 2,
        }));
    });

    it('not it or test', async () => {
        const content = `<?php 

function hello(string $description,  callable $closure) {}

hello('hello', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'hello')).toBeUndefined();
    });

    it('test with namespace', async () => {
        const content = `<?php 

namespace Tests\\Fixtures\\Examples;

it('asserts true is true', function () {
    expect(true)->toBe(true);
});
        `;

        expect(givenTest(file, content, 'it asserts true is true')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::it asserts true is true',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: 'it asserts true is true',
            label: 'it asserts true is true',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 2,
        }));
    });

    it('test with namedargument', async () => {
        const content = `<?php 

describe(description: 'something', test: function () {
    it(description: 'asserts true is true', test: function () {
        expect(true)->toBe(true);
    });
});
        `;

        expect(givenTest(file, content, '`something` → it asserts true is true')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::`something` → it asserts true is true',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`something` → it asserts true is true',
            label: 'it asserts true is true',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 3,
        }));
    });

    it('parse arch', async () => {
        const content = `<?php 

arch()->preset()->php();
arch()->preset()->strict();
arch()->preset()->security();

        `;

        expect(givenTest(file, content, 'preset  → php ')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::preset  → php ',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: 'preset  → php ',
            label: 'preset → php',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 2,
        }));

        expect(givenTest(file, content, 'preset  → strict ')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::preset  → strict ',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: 'preset  → strict ',
            label: 'preset → strict',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 2,
        }));

        expect(givenTest(file, content, 'preset  → security ')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::preset  → security ',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: 'preset  → security ',
            label: 'preset → security',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 2,
        }));
    });

    it('parse arch with name', async () => {
        const content = `<?php 

arch('Then should pass the PHP preset')->preset()->php();

        `;

        expect(givenTest(file, content, 'Then should pass the PHP preset')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::Then should pass the PHP preset',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: 'Then should pass the PHP preset',
            label: 'Then should pass the PHP preset',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 2,
        }));
    });

    it('parse describe arch', () => {
        const content = `<?php 

describe('Given a project', function () {
    describe('When the architecture is tested', function () {
        arch('Then should pass the PHP preset')->preset()->php();
    });
});

        `;

        expect(givenTest(file, content, '`Given a project` → `When the architecture is tested` → Then should pass the PHP preset')).toEqual(expect.objectContaining({
            type: TestType.method,
            id: 'tests/Fixtures/ExampleTest.php::`Given a project` → `When the architecture is tested` → Then should pass the PHP preset',
            classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
            namespace: 'P\\Tests\\Fixtures',
            className: 'ExampleTest',
            methodName: '`Given a project` → `When the architecture is tested` → Then should pass the PHP preset',
            label: 'Then should pass the PHP preset',
            file,
            start: { line: expect.any(Number), character: expect.any(Number) },
            end: { line: expect.any(Number), character: expect.any(Number) },
            depth: 4,
        }));
    });
});