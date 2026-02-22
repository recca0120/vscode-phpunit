import { beforeAll, describe, expect, it } from 'vitest';
import { findTest, parseTestFile, pestProject } from '../../tests/utils';
import { TestType } from '../types';
import type { AstParser } from './AstParser/AstParser';
import { PhpParserAstParser } from './AstParser/php-parser/PhpParserAstParser';
import { TreeSitterAstParser } from './AstParser/tree-sitter/TreeSitterAstParser';
import { initTreeSitter } from './AstParser/tree-sitter/TreeSitterParser';

const parsers: [string, () => AstParser][] = [
    ['tree-sitter', () => new TreeSitterAstParser()],
    ['php-parser', () => new PhpParserAstParser()],
];

export const parse = (buffer: Buffer | string, file: string, astParser?: AstParser) =>
    parseTestFile(buffer, file, pestProject(''), astParser);

beforeAll(async () => initTreeSitter());

describe.each(parsers)('PestParser (%s)', (_name, createParser) => {
    const givenTest = (file: string, content: string, id: string) => {
        return findTest(parse(content, file, createParser()), id);
    };

    const file = pestProject('tests/Fixtures/ExampleTest.php');

    it('namespace:Tests\\Fixtures', async () => {
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

    it('ExampleTest', async () => {
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

    it('example', async () => {
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

    it('it test example', async () => {
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

    it('`something` → example', async () => {
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

    it('arrow function `something` → it example', async () => {
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

    it('it example 2', () => {
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

    it('test with namedargument', async () => {
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

    it('parse arch', async () => {
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

    it('parse arch with name', async () => {
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

    it('named keys dataset', () => {
        const content = `<?php

it('adds numbers', function (int $a, int $b, int $expected) {
    expect($a + $b)->toBe($expected);
})->with(['one plus one' => [1, 1, 2], 'two plus three' => [2, 3, 5]]);
        `;

        const test = givenTest(file, content, 'it adds numbers');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                methodName: 'it adds numbers',
                annotations: expect.objectContaining({
                    dataset: ['"one plus one"', '"two plus three"'],
                }),
            }),
        );
    });

    it('numeric tuples dataset', () => {
        const content = `<?php

it('multiplies numbers', function (int $a, int $b, int $expected) {
    expect($a * $b)->toBe($expected);
})->with([[2, 3, 6], [4, 5, 20]]);
        `;

        const test = givenTest(file, content, 'it multiplies numbers');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                methodName: 'it multiplies numbers',
                annotations: expect.objectContaining({
                    dataset: ['#0', '#1'],
                }),
            }),
        );
    });

    it('string values dataset', () => {
        const content = `<?php

it('validates emails', function (string $email) {
    expect($email)->not->toBeEmpty();
})->with(['alice@example.com', 'bob@example.com']);
        `;

        const test = givenTest(file, content, 'it validates emails');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                methodName: 'it validates emails',
                annotations: expect.objectContaining({
                    dataset: ['#0', '#1'],
                }),
            }),
        );
    });

    it('chained ->with()->with() produces cartesian product (#21)', () => {
        const content = `<?php

it('business closed', function (string $business, string $day) {
    expect(true)->toBeTrue();
})->with(['Office', 'Bank'])->with(['Saturday', 'Sunday']);
        `;

        const test = givenTest(file, content, 'it business closed');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                methodName: 'it business closed',
                annotations: expect.objectContaining({
                    dataset: [
                        `"(|'Office|', |'Saturday|')"`,
                        `"(|'Office|', |'Sunday|')"`,
                        `"(|'Bank|', |'Saturday|')"`,
                        `"(|'Bank|', |'Sunday|')"`,
                    ],
                }),
            }),
        );
    });

    it('generator closure dataset with named keys', () => {
        const content = `<?php
it('adds numbers', function (int $a, int $b, int $expected) {
    expect($a + $b)->toBe($expected);
})->with(function () {
    yield 'one plus one' => [1, 1, 2];
    yield 'two plus three' => [2, 3, 5];
});
    `;
        const test = givenTest(file, content, 'it adds numbers');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                methodName: 'it adds numbers',
                annotations: expect.objectContaining({
                    dataset: ['"one plus one"', '"two plus three"'],
                }),
            }),
        );
    });

    it('generator closure dataset with numeric keys', () => {
        const content = `<?php
it('multiplies numbers', function (int $a, int $b, int $expected) {
    expect($a * $b)->toBe($expected);
})->with(function () {
    yield [2, 3, 6];
    yield [4, 5, 20];
});
    `;
        const test = givenTest(file, content, 'it multiplies numbers');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                methodName: 'it multiplies numbers',
                annotations: expect.objectContaining({
                    dataset: ['#0', '#1'],
                }),
            }),
        );
    });

    it('bound dataset with closure array', () => {
        const content = `<?php
it('generates name', function (object $user) {
    expect($user)->toBeObject();
})->with([
    fn() => (object) ['first_name' => 'Nuno'],
    fn() => (object) ['first_name' => 'Luke'],
]);
    `;
        const test = givenTest(file, content, 'it generates name');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                methodName: 'it generates name',
                annotations: expect.objectContaining({
                    dataset: ['#0', '#1'],
                }),
            }),
        );
    });

    it('parse describe arch', () => {
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
