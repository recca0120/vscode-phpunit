import { beforeAll, describe, expect, it } from 'vitest';
import { pestProject } from '../../test-support/fixtures';
import { parsers } from '../../test-support/parsers';
import { findTest, parseTestFile } from '../../test-support/parsing';
import type { AstParser } from '../Interpreter/AstParser/AstParser';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
import { TestType } from '../types';

const parse = (buffer: Buffer | string, file: string, astParser?: AstParser) =>
    parseTestFile(buffer, file, pestProject(''), astParser);

beforeAll(async () => initTreeSitter());

describe.each(parsers)('TestParser on Pest datasets (%s)', (_name, createParser) => {
    const givenTest = (file: string, content: string, id: string) =>
        findTest(parse(content, file, createParser()), id);

    const file = pestProject('tests/Fixtures/ExampleTest.php');

    it('labels a dataset by its named keys', () => {
        const content = `<?php

it('adds numbers', function (int $a, int $b, int $expected) {
    expect($a + $b)->toBe($expected);
})->with(['one plus one' => [1, 1, 2], 'two plus three' => [2, 3, 5]]);
        `;

        const test = givenTest(file, content, 'it adds numbers');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::it adds numbers',
                label: 'it adds numbers',
                methodName: 'it adds numbers',
                annotations: {
                    dataset: [
                        'data set "dataset "one plus one""',
                        'data set "dataset "two plus three""',
                    ],
                },
            }),
        );
    });

    it('labels a dataset of tuples by their values', () => {
        const content = `<?php

it('multiplies numbers', function (int $a, int $b, int $expected) {
    expect($a * $b)->toBe($expected);
})->with([[2, 3, 6], [4, 5, 20]]);
        `;

        const test = givenTest(file, content, 'it multiplies numbers');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::it multiplies numbers',
                label: 'it multiplies numbers',
                methodName: 'it multiplies numbers',
                annotations: { dataset: ['data set "(2, 3, 6)"', 'data set "(4, 5, 20)"'] },
            }),
        );
    });

    it('truncates tuple values beyond 3 items with ellipsis', () => {
        const content = `<?php

it('has many args', function (int $a, int $b, int $c, int $d, int $e) {
    expect(true)->toBeTrue();
})->with([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]]);
        `;

        const test = givenTest(file, content, 'it has many args');
        expect(test).toEqual(
            expect.objectContaining({
                annotations: {
                    dataset: ['data set "(1, 2, 3, …)"', 'data set "(6, 7, 8, …)"'],
                },
            }),
        );
    });

    it('truncated tuples with same prefix get unique labels', () => {
        const content = `<?php

it('same prefix', function (int $a, int $b, int $c, int $d) {
    expect(true)->toBeTrue();
})->with([[1, 2, 3, 100], [1, 2, 3, 200]]);
        `;

        const test = givenTest(file, content, 'it same prefix');
        const labels = test?.annotations?.dataset as string[];
        expect(labels).toBeDefined();
        expect(labels.length).toBe(2);
        expect(labels[0]).not.toBe(labels[1]);
    });

    it('labels a dataset of strings', () => {
        const content = `<?php

it('validates emails', function (string $email) {
    expect($email)->not->toBeEmpty();
})->with(['alice@example.com', 'bob@example.com']);
        `;

        const test = givenTest(file, content, 'it validates emails');
        expect(test).toEqual(
            expect.objectContaining({
                type: TestType.method,
                id: 'tests/Fixtures/ExampleTest.php::it validates emails',
                label: 'it validates emails',
                methodName: 'it validates emails',
                annotations: {
                    dataset: [`data set "('alice@example.com')"`, `data set "('bob@example.com')"`],
                },
            }),
        );
    });

    it('labels a dataset of integers', () => {
        const content = `<?php

test('numbers', function (int $n) {
    expect($n)->toBeInt();
})->with([1, 2, 3]);
        `;

        expect(givenTest(file, content, 'numbers')?.annotations?.dataset).toEqual([
            'data set "(1)"',
            'data set "(2)"',
            'data set "(3)"',
        ]);
    });

    it('labels a dataset of booleans', () => {
        const content = `<?php

test('flags', function (bool $flag) {
    expect($flag)->toBeBool();
})->with([true, FALSE]);
        `;

        expect(givenTest(file, content, 'flags')?.annotations?.dataset).toEqual([
            'data set "(true)"',
            'data set "(false)"',
        ]);
    });

    it('labels a dataset of null', () => {
        const content = `<?php

test('nothing', function ($value) {
    expect($value)->toBeNull();
})->with([null]);
        `;

        expect(givenTest(file, content, 'nothing')?.annotations?.dataset).toEqual([
            'data set "(null)"',
        ]);
    });

    it('labels a dataset of floats', () => {
        const content = `<?php

test('ratios', function (float $ratio) {
    expect($ratio)->toBeFloat();
})->with([1.5, 0.25]);
        `;

        expect(givenTest(file, content, 'ratios')?.annotations?.dataset).toEqual([
            'data set "(1.5)"',
            'data set "(0.25)"',
        ]);
    });

    it('integral float dataset has no static labels', () => {
        const content = `<?php

test('ratios', function (float $ratio) {
    expect($ratio)->toBeFloat();
})->with([2.0]);
        `;

        expect(givenTest(file, content, 'ratios')?.annotations).toEqual({});
    });

    it('small float dataset has no static labels', () => {
        const content = `<?php

test('ratios', function (float $ratio) {
    expect($ratio)->toBeFloat();
})->with([0.00001]);
        `;

        expect(givenTest(file, content, 'ratios')?.annotations).toEqual({});
    });

    it('large float dataset has no static labels', () => {
        const content = `<?php

test('ratios', function (float $ratio) {
    expect($ratio)->toBeFloat();
})->with([1000000000000000.5]);
        `;

        expect(givenTest(file, content, 'ratios')?.annotations).toEqual({});
    });

    it('object dataset has no static labels', () => {
        const content = `<?php

test('objects', function (Foo $foo) {
    expect($foo)->toBeObject();
})->with([new Foo()]);
        `;

        expect(givenTest(file, content, 'objects')?.annotations).toEqual({});
    });

    it('tuple dataset containing an object has no static labels', () => {
        const content = `<?php

test('objects', function (int $n, Foo $foo) {
    expect($foo)->toBeObject();
})->with([[1, new Foo()]]);
        `;

        expect(givenTest(file, content, 'objects')?.annotations).toEqual({});
    });

    it('concatenation with a constant has no static labels', () => {
        const content = `<?php

test('versions', function (string $version) {
    expect($version)->toBeString();
})->with(['php-' . PHP_VERSION]);
        `;

        expect(givenTest(file, content, 'versions')?.annotations).toEqual({});
    });

    it('ternary yielding a constant has no static labels', () => {
        const content = `<?php

test('versions', function (string $version) {
    expect($version)->toBeString();
})->with([1 > 2 ? 'none' : PHP_VERSION]);
        `;

        expect(givenTest(file, content, 'versions')?.annotations).toEqual({});
    });

    it('chained ->with() formats non-string values like Pest', () => {
        const content = `<?php

test('closed', function ($open, string $day) {
    expect(true)->toBeTrue();
})->with([true, 1])->with(['Saturday']);
        `;

        expect(givenTest(file, content, 'closed')?.annotations?.dataset).toEqual([
            `data set "(true) / ('Saturday')"`,
            `data set "(1) / ('Saturday')"`,
        ]);
    });

    it('chained ->with() containing an object has no static labels', () => {
        const content = `<?php

test('closed', function (Foo $foo, string $day) {
    expect(true)->toBeTrue();
})->with([new Foo()])->with(['Saturday']);
        `;

        expect(givenTest(file, content, 'closed')?.annotations).toEqual({});
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
                id: 'tests/Fixtures/ExampleTest.php::it business closed',
                label: 'it business closed',
                methodName: 'it business closed',
                annotations: {
                    dataset: [
                        `data set "('Office') / ('Saturday')"`,
                        `data set "('Office') / ('Sunday')"`,
                        `data set "('Bank') / ('Saturday')"`,
                        `data set "('Bank') / ('Sunday')"`,
                    ],
                },
            }),
        );
    });

    it('chained ->with() with named keys uses the dataset label like Pest', () => {
        const content = `<?php

it('business closed', function (string $business, string $day) {
    expect(true)->toBeTrue();
})->with(['office' => 'Office', 'bank' => 'Bank'])->with(['Saturday']);
        `;

        expect(givenTest(file, content, 'it business closed')?.annotations?.dataset).toEqual([
            `data set "dataset "office" / ('Saturday')"`,
            `data set "dataset "bank" / ('Saturday')"`,
        ]);
    });

    it('bool and null dataset keys are cast like PHP array keys', () => {
        const content = `<?php

test('casts', function (string $value) {
    expect($value)->toBeString();
})->with([true => 'yes', false => 'no', null => 'none']);
        `;

        expect(givenTest(file, content, 'casts')?.annotations?.dataset).toEqual([
            `data set "('yes')"`,
            `data set "('no')"`,
            'data set "dataset """',
        ]);
    });

    it('nested arrays in a tuple dataset are exported like Pest', () => {
        const content = `<?php

test('nested', function (int $n, array $items) {
    expect($items)->toBeArray();
})->with([[1, [2, 3, 4, 5]]]);
        `;

        expect(givenTest(file, content, 'nested')?.annotations?.dataset).toEqual([
            'data set "(1, [2, 3, 4, …])"',
        ]);
    });

    it('labels a generator dataset by its named keys', () => {
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
                id: 'tests/Fixtures/ExampleTest.php::it adds numbers',
                label: 'it adds numbers',
                methodName: 'it adds numbers',
                annotations: {
                    dataset: [
                        'data set "dataset "one plus one""',
                        'data set "dataset "two plus three""',
                    ],
                },
            }),
        );
    });

    it('labels a generator dataset with numeric keys', () => {
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
                id: 'tests/Fixtures/ExampleTest.php::it multiplies numbers',
                label: 'it multiplies numbers',
                methodName: 'it multiplies numbers',
                annotations: {},
            }),
        );
    });

    it('labels a generator dataset that yields inside a for loop', () => {
        const content = `<?php
it('handles cases', function (int $i) {
    expect($i)->toBeInt();
})->with(function () {
    for ($i = 0; $i < 3; $i++) {
        yield "case $i" => [$i];
    }
});
    `;
        expect(givenTest(file, content, 'it handles cases')?.annotations?.dataset).toEqual([
            'data set "dataset "case 0""',
            'data set "dataset "case 1""',
            'data set "dataset "case 2""',
        ]);
    });

    it('labels a generator dataset that yields inside a while loop after an assignment', () => {
        const content = `<?php
it('handles items', function (int $i) {
    expect($i)->toBeInt();
})->with(function () {
    $i = 0;
    while ($i < 2) {
        yield "item $i" => [$i];
        $i++;
    }
});
    `;
        expect(givenTest(file, content, 'it handles items')?.annotations?.dataset).toEqual([
            'data set "dataset "item 0""',
            'data set "dataset "item 1""',
        ]);
    });

    it('labels a generator dataset by its foreach keys', () => {
        const content = `<?php
it('handles pairs', function (int $v) {
    expect($v)->toBeInt();
})->with(function () {
    foreach (['a' => 1, 'b' => 2] as $k => $v) {
        yield $k => [$v];
    }
});
    `;
        expect(givenTest(file, content, 'it handles pairs')?.annotations?.dataset).toEqual([
            'data set "dataset "a""',
            'data set "dataset "b""',
        ]);
    });

    it('labels a bound dataset of closures', () => {
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
                id: 'tests/Fixtures/ExampleTest.php::it generates name',
                label: 'it generates name',
                methodName: 'it generates name',
                annotations: {},
            }),
        );
    });

    it('labels a generator dataset with integer keys yielded in a loop', () => {
        const content = `<?php
it('handles numbers', function (int $i) {
    expect($i)->toBeInt();
})->with(function () {
    for ($i = 5; $i < 7; $i++) {
        yield $i => [$i];
    }
});
    `;
        expect(givenTest(file, content, 'it handles numbers')?.annotations?.dataset).toEqual([
            'data set "(5)"',
            'data set "(6)"',
        ]);
    });

    it('labels a generator dataset with keyless yields in a loop', () => {
        const content = `<?php
it('handles numbers', function (int $i) {
    expect($i)->toBeInt();
})->with(function () {
    for ($i = 0; $i < 2; $i++) {
        yield [$i];
    }
});
    `;
        expect(givenTest(file, content, 'it handles numbers')?.annotations?.dataset).toEqual([
            'data set "(0)"',
            'data set "(1)"',
        ]);
    });

    it('labels an arrow-function dataset that returns a list', () => {
        const content = `<?php
test('numbers', function (int $n) {
    expect($n)->toBeInt();
})->with(fn () => [1, 2]);
    `;
        expect(givenTest(file, content, 'numbers')?.annotations?.dataset).toEqual([
            'data set "(1)"',
            'data set "(2)"',
        ]);
    });

    it('labels a closure dataset that returns an array', () => {
        const content = `<?php
it('adds numbers', function (int $a, int $b) {
    expect($a + $b)->toBeInt();
})->with(function () {
    return [
        'one plus one' => [1, 1],
        [2, 3],
    ];
});
    `;
        expect(givenTest(file, content, 'it adds numbers')?.annotations?.dataset).toEqual([
            'data set "dataset "one plus one""',
            'data set "(2, 3)"',
        ]);
    });

    it('labels a dataset of signed numbers', () => {
        const content = `<?php

test('signed', function (int|float $n) {
    expect($n)->toBeNumeric();
})->with([-1, -1.5, +2]);
        `;

        expect(givenTest(file, content, 'signed')?.annotations?.dataset).toEqual([
            'data set "(-1)"',
            'data set "(-1.5)"',
            'data set "(2)"',
        ]);
    });
});
