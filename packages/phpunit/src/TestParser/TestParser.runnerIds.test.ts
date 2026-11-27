import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, onTestFinished } from 'vitest';
import { parsers } from '../../tests/support/parsers';
import { findTest, parseTestFile } from '../../tests/support/parsing';
import { runnerStartedTestIds } from '../../tests/support/runner';
import { detectPestStubs, detectPhpUnitStubs } from '../../tests/support/stubs';
import { datasetNaming } from '../Dataset/DatasetNaming';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
import { TestType } from '../types';

beforeAll(async () => initTreeSitter());

const providerTestClass = (className: string, providerBody: string) => `<?php
use PHPUnit\\Framework\\Attributes\\DataProvider;
use PHPUnit\\Framework\\TestCase;

class ${className} extends TestCase
{
    const CASES = ['alpha', 'beta'];

    /**
     * @dataProvider provider
     */
    #[DataProvider('provider')]
    public function test_provided(mixed $value): void
    {
        $this->assertSame($value, $value);
    }

    public static function provider(): iterable
    {
        ${providerBody}
    }
}
`;

describe('TestParser ids match the ids the real runner reports', () => {
    describe.each(detectPhpUnitStubs())('PHPUnit $name', ({ root, binary }) => {
        const runPhpUnit = (className: string, content: string) => {
            const dir = mkdtempSync(join(tmpdir(), 'phpunit-runner-ids-'));
            onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
            const file = join(dir, `${className}.php`);
            writeFileSync(file, content);
            const reported = runnerStartedTestIds(
                [binary, '--no-configuration', '--teamcity', file],
                root,
            );
            return { dir, file, reported };
        };

        const expectDataSetIdsToMatchTheRunner = (className: string, providerBody: string) => {
            const content = providerTestClass(className, providerBody);
            const { dir, file, reported } = runPhpUnit(className, content);

            for (const [, createParser] of parsers) {
                const method = findTest(
                    parseTestFile(content, file, dir, createParser()),
                    'test_provided',
                );
                const labels = (method?.annotations?.dataset as string[] | undefined) ?? [];
                const parsed = method
                    ? datasetNaming.fromAnnotations(method, labels).map((child) => child.id)
                    : [];

                expect(parsed).toEqual(reported);
            }
        };

        it('names data sets keyed with substr and negative arguments', { timeout: 60_000 }, () => {
            expectDataSetIdsToMatchTheRunner(
                'SubstrProviderTest',
                `return [
            substr('hello', 1, -1) => [1],
            substr('hello', -3, -1) => [2],
            substr('hello', -3, 3) => [3],
        ];`,
            );
        });

        it('names data sets keyed with a class constant in a nested loop', {
            timeout: 60_000,
        }, () => {
            expectDataSetIdsToMatchTheRunner(
                'NestedLoopProviderTest',
                `foreach ([1, 2] as $i) {
            foreach (self::CASES as $case) {
                yield $case . $i => [$i];
            }
        }`,
            );
        });

        it('names data sets keyed with an element of the looped row', { timeout: 60_000 }, () => {
            expectDataSetIdsToMatchTheRunner(
                'RowElementProviderTest',
                `foreach ([['a', 1], ['b', 2]] as $row) {
            yield $row[0] => [$row[1]];
        }`,
            );
        });

        it('names data sets keyed with a tab escape sequence', { timeout: 60_000 }, () => {
            expectDataSetIdsToMatchTheRunner(
                'EscapedKeyProviderTest',
                'return ["tab\there" => [1]];',
            );
        });

        it('lists a trait test method and its alias (ids, in any order)', {
            timeout: 60_000,
        }, () => {
            const content = `<?php
use PHPUnit\\Framework\\TestCase;

trait GreetingTrait
{
    public function test_hello()
    {
        $this->assertTrue(true);
    }
}

class TraitAliasTest extends TestCase
{
    use GreetingTrait {
        test_hello as test_greeting;
    }
}
`;
            const { dir, file, reported } = runPhpUnit('TraitAliasTest', content);

            for (const [, createParser] of parsers) {
                const parsed = parseTestFile(content, file, dir, createParser())
                    .filter((test) => test.className === 'TraitAliasTest' && test.methodName)
                    .map((test) => test.id);

                expect([...parsed].sort()).toEqual([...reported].sort());
            }
        });
    });

    describe.each(detectPestStubs())('Pest $name', ({ root, binary, args }) => {
        it('names a describe(Foo::class) after the namespace it is in (test name part of the id)', {
            timeout: 60_000,
        }, () => {
            const dir = join(root, 'runner-ids');
            mkdirSync(dir, { recursive: true });
            onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
            const file = join(dir, 'MultiNamespaceTest.php');
            const content = `<?php
namespace First {
    class Alpha {}
}

namespace Second {
    describe(Beta::class, function () {
        it('works', fn () => expect(true)->toBeTrue());
    });
}
`;
            writeFileSync(file, content);

            const testName = (id: string) => id.slice(id.indexOf('::') + 2);
            const reported = runnerStartedTestIds(
                [binary, ...args, '--teamcity', 'runner-ids/MultiNamespaceTest.php'],
                root,
            ).map(testName);

            for (const [, createParser] of parsers) {
                const parsed = parseTestFile(content, file, root, createParser())
                    .filter((test) => test.type === TestType.method)
                    .map((test) => testName(test.id));

                expect(parsed).toEqual(reported);
            }
        });
    });
});
