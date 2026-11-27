import { beforeAll, describe, expect, it } from 'vitest';
import { pestProject } from '../../tests/support/fixtures';
import { parsers } from '../../tests/support/parsers';
import { findTest, parseTestFile } from '../../tests/support/parsing';
import type { AstParser } from '../Interpreter/AstParser/AstParser';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
import { TestType } from '../types';

const parse = (buffer: Buffer | string, file: string, astParser?: AstParser) =>
    parseTestFile(buffer, file, pestProject(''), astParser);

beforeAll(async () => initTreeSitter());

describe.each(parsers)('TestParser on Pest test structure (%s)', (_name, createParser) => {
    const givenTest = (file: string, content: string, id: string) =>
        findTest(parse(content, file, createParser()), id);

    const file = pestProject('tests/Fixtures/ExampleTest.php');

    it('derives the namespace node from the folder of the file', () => {
        const content = `<?php 

test('example', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'P\\Tests\\Fixtures')).toEqual(
            expect.objectContaining({
                type: TestType.namespace,
                id: 'namespace:Tests\\Fixtures',
                classFQN: 'P\\Tests\\Fixtures',
                namespace: 'P\\Tests\\Fixtures',
                label: 'Tests\\Fixtures',
            }),
        );
    });

    it('test range ends at the closing parenthesis of the call', () => {
        const content = `<?php

test('example', function () {
    expect(true)->toBeTrue();
});
`;
        expect(givenTest(file, content, 'example')).toEqual(
            expect.objectContaining({
                start: { line: 3, character: 0 },
                end: { line: 5, character: 2 },
            }),
        );
    });

    it('turns the file into a class node', () => {
        const content = `<?php 

test('example', function () {
    expect(true)->toBeTrue();
})
`;
        expect(givenTest(file, content, 'ExampleTest')).toEqual(
            expect.objectContaining({
                type: TestType.class,
                id: 'Tests\\Fixtures\\ExampleTest',
                classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
                namespace: 'P\\Tests\\Fixtures',
                className: 'ExampleTest',
                label: 'ExampleTest',
                file,
                start: { line: expect.any(Number), character: expect.any(Number) },
                end: { line: expect.any(Number), character: expect.any(Number) },
            }),
        );
    });

    it('parses a test() call', () => {
        const content = `<?php 

test('example', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'example')).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('parses an it() call', () => {
        const content = `<?php

it('test example', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'it test example')).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('`something` → example', () => {
        const content = `<?php

describe('something', function () {
    test('example', function () {
        expect(true)->toBeTrue();
    });
});
        `;

        expect(givenTest(file, content, '`something`')).toEqual(
            expect.objectContaining({
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
            }),
        );

        expect(givenTest(file, content, '`something` → example')).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('arrow function `something` → it example', () => {
        const content = `<?php
        
describe('something', fn () => it('example', fn() => expect(true)->toBeTrue()));

        `;

        expect(givenTest(file, content, '`something` → it example')).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('`something` → `something else` → it test example', () => {
        const content = `<?php

describe('something', function () {
    describe('something else', function () {
        it('test example', function () {
            expect(true)->toBeTrue();
        });
    });
}); 
        `;

        expect(givenTest(file, content, '`something` → `something else`')).toEqual(
            expect.objectContaining({
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
            }),
        );

        expect(
            givenTest(file, content, '`something` → `something else` → it test example'),
        ).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('describe with a constant description keeps its children', () => {
        const content = `<?php

describe(SOME_CONST, function () {
    it('test example', function () {
        expect(true)->toBeTrue();
    });
});
        `;

        expect(givenTest(file, content, '`describe` → it test example')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::`describe` → it test example',
                label: 'it test example',
            }),
        );
    });

    it('parses an it() call without a closure', () => {
        const content = `<?php

it('example 2')->assertTrue(true);
        `;

        expect(givenTest(file, content, 'it example 2')).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('parses a double-quoted test description', () => {
        const content = `<?php

test("plain double", function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'plain double')).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::plain double',
                methodName: 'plain double',
                label: 'plain double',
            }),
        );
    });

    it('ignores calls to non-Pest functions', () => {
        const content = `<?php 

function hello(string $description,  callable $closure) {}

hello('hello', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'hello')).toBeUndefined();
    });

    it('parses a test in a file with a namespace', () => {
        const content = `<?php 

namespace Tests\\Fixtures\\Examples;

it('asserts true is true', function () {
    expect(true)->toBe(true);
});
        `;

        expect(givenTest(file, content, 'it asserts true is true')).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('parses a test called with named arguments', () => {
        const content = `<?php 

describe(description: 'something', test: function () {
    it(description: 'asserts true is true', test: function () {
        expect(true)->toBe(true);
    });
});
        `;

        expect(givenTest(file, content, '`something` → it asserts true is true')).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('parses an arch() test', () => {
        const content = `<?php 

arch()->preset()->php();
arch()->preset()->strict();
arch()->preset()->security();

        `;

        expect(givenTest(file, content, 'preset  → php ')).toEqual(
            expect.objectContaining({
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
            }),
        );

        expect(givenTest(file, content, 'preset  → strict ')).toEqual(
            expect.objectContaining({
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
            }),
        );

        expect(givenTest(file, content, 'preset  → security ')).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('parses a named arch() test', () => {
        const content = `<?php 

arch('Then should pass the PHP preset')->preset()->php();

        `;

        expect(givenTest(file, content, 'Then should pass the PHP preset')).toEqual(
            expect.objectContaining({
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
            }),
        );
    });

    it('resolves describe(Foo::class) through a use statement', () => {
        const content = `<?php

namespace Foo\\tests\\Unit;

use Foo\\Services\\PlaylistService;

describe(PlaylistService::class, function() {
    it('should detect this test', function() {
        expect(true)->toBeTrue();
    });
});
        `;

        expect(
            givenTest(
                file,
                content,
                '`Foo\\Services\\PlaylistService` → it should detect this test',
            ),
        ).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::`Foo\\Services\\PlaylistService` → it should detect this test',
                methodName: '`Foo\\Services\\PlaylistService` → it should detect this test',
                label: 'it should detect this test',
                file,
            }),
        );
    });

    it('resolves describe(\\Foo::class) by its fully qualified name', () => {
        const content = `<?php

namespace Foo\\tests\\Unit;

describe(\\Foo\\Services\\PlaylistService::class, function() {
    it('should detect this test', function() {
        expect(true)->toBeTrue();
    });
});
        `;

        expect(
            givenTest(
                file,
                content,
                '`Foo\\Services\\PlaylistService` → it should detect this test',
            ),
        ).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::`Foo\\Services\\PlaylistService` → it should detect this test',
                methodName: '`Foo\\Services\\PlaylistService` → it should detect this test',
                label: 'it should detect this test',
                file,
            }),
        );
    });

    it('parses arch() tests inside nested describes', () => {
        const content = `<?php

describe('Given a project', function () {
    describe('When the architecture is tested', function () {
        arch('Then should pass the PHP preset')->preset()->php();
    });
});

        `;

        expect(
            givenTest(
                file,
                content,
                '`Given a project` → `When the architecture is tested` → Then should pass the PHP preset',
            ),
        ).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::`Given a project` → `When the architecture is tested` → Then should pass the PHP preset',
                classFQN: 'P\\Tests\\Fixtures\\ExampleTest',
                namespace: 'P\\Tests\\Fixtures',
                className: 'ExampleTest',
                methodName:
                    '`Given a project` → `When the architecture is tested` → Then should pass the PHP preset',
                label: 'Then should pass the PHP preset',
                file,
                start: { line: expect.any(Number), character: expect.any(Number) },
                end: { line: expect.any(Number), character: expect.any(Number) },
            }),
        );
    });
});
