import { beforeAll, describe, expect, it } from 'vitest';
import { pestProject } from '../../tests/support/fixtures';
import { parsers } from '../../tests/support/parsers';
import { findTest, parseTestFile } from '../../tests/support/parsing';
import type { AstParser } from '../Interpreter/AstParser/AstParser';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';

const parse = (buffer: Buffer | string, file: string, astParser?: AstParser) =>
    parseTestFile(buffer, file, pestProject(''), astParser);

beforeAll(async () => initTreeSitter());

describe.each(parsers)('TestParser on Pest modifiers (%s)', (_name, createParser) => {
    const givenTest = (file: string, content: string, id: string) =>
        findTest(parse(content, file, createParser()), id);

    const file = pestProject('tests/Fixtures/ExampleTest.php');

    it('captures ->skip(reason) after an unsupported condition', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
})->skip(! isset($_SERVER['CI']), 'not ready yet');
        `;

        expect(givenTest(file, content, 'it does something')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({
                    skipped: true,
                    skipReason: 'not ready yet',
                }),
            }),
        );
    });

    it('marks ->skip() tests with annotations.skipped', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
})->skip();
        `;

        expect(givenTest(file, content, 'it does something')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({ skipped: true }),
            }),
        );
    });

    it('captures ->skip(reason) in annotations.skipReason', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
})->skip('not ready yet');
        `;

        expect(givenTest(file, content, 'it does something')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({
                    skipped: true,
                    skipReason: 'not ready yet',
                }),
            }),
        );
    });

    it('captures ->skip(condition, reason) in annotations.skipReason', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
})->skip(true, 'not ready yet');
        `;

        expect(givenTest(file, content, 'it does something')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({
                    skipped: true,
                    skipReason: 'not ready yet',
                }),
            }),
        );
    });

    it('does not mark ->skip(false, reason) tests as skipped', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
})->skip(false, 'not ready yet');
        `;

        expect(givenTest(file, content, 'it does something')?.annotations).toEqual({});
    });

    it('marks ->todo() tests with annotations.todo', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
})->todo();
        `;

        expect(givenTest(file, content, 'it does something')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({ todo: true }),
            }),
        );
    });

    it('marks ->todo(assignee:, issue:) tests with annotations.todoAssignee/todoIssue', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
})->todo(assignee: 'taylor@laravel.com', issue: 123);
        `;

        expect(givenTest(file, content, 'it does something')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({
                    todo: true,
                    todoAssignee: 'taylor@laravel.com',
                    todoIssue: '123',
                }),
            }),
        );
    });

    it('marks ->skipOnCi() tests with annotations.conditionalSkip "onCi"', () => {
        const content = `<?php

it('needs a real server', function () {
    expect(true)->toBeTrue();
})->skipOnCi();
        `;

        expect(givenTest(file, content, 'it needs a real server')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({ conditionalSkip: 'onCi' }),
            }),
        );
    });

    it('marks ->skipLocally() tests with annotations.conditionalSkip "locally"', () => {
        const content = `<?php

it('needs local docker', function () {
    expect(true)->toBeTrue();
})->skipLocally();
        `;

        expect(givenTest(file, content, 'it needs local docker')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({ conditionalSkip: 'locally' }),
            }),
        );
    });

    it('marks ->only() tests with annotations.only', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
})->only();
        `;

        expect(givenTest(file, content, 'it does something')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({ only: true }),
            }),
        );
    });

    it('collects ->group() arguments into annotations.group', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
})->group('slow', 'network');
        `;

        expect(givenTest(file, content, 'it does something')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({ group: ['slow', 'network'] }),
            }),
        );
    });

    it('marks browser tests with annotations.browserTest', () => {
        const content = `<?php

it('may welcome the user', function () {
    $page = visit('/');
    $page->assertSee('Welcome');
});
        `;

        expect(givenTest(file, content, 'it may welcome the user')).toEqual(
            expect.objectContaining({
                annotations: expect.objectContaining({ browserTest: true }),
            }),
        );
    });

    it('does not mark ordinary tests with annotations.browserTest', () => {
        const content = `<?php

it('does something', function () {
    expect(true)->toBeTrue();
});
        `;

        expect(givenTest(file, content, 'it does something')?.annotations?.browserTest).toBeFalsy();
    });
});
