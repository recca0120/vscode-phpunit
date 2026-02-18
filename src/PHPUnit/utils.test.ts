import { describe, expect, it } from 'vitest';
import {
    camelCase,
    capitalize,
    checkFileExists,
    cloneInstance,
    findAsyncSequential,
    parseArguments,
    parseArgv,
    snakeCase,
    splitFQN,
    titleCase,
    uncapitalize,
} from './utils';

describe('utils', () => {
    describe('parseArgv', () => {
        it('should split simple args', () => {
            expect(parseArgv('php vendor/bin/phpunit --filter=test_passed')).toEqual([
                'php',
                'vendor/bin/phpunit',
                '--filter=test_passed',
            ]);
        });

        it('should keep double-quoted content as single token and strip quotes', () => {
            expect(parseArgv('ssh -i key "cd /app; php test"')).toEqual([
                'ssh',
                '-i',
                'key',
                'cd /app; php test',
            ]);
        });

        it('should keep single-quoted content as single token and strip quotes', () => {
            expect(
                parseArgv(
                    "php vendor/bin/phpunit '--filter=^.*::(test_passed)( with data set .*)?$'",
                ),
            ).toEqual([
                'php',
                'vendor/bin/phpunit',
                '--filter=^.*::(test_passed)( with data set .*)?$',
            ]);
        });

        it('should handle empty string', () => {
            expect(parseArgv('')).toEqual([]);
        });
    });

    describe('parseArguments', () => {
        it('should parse long option with =', () => {
            expect(parseArguments(['--configuration=/app/phpunit.xml'], [])).toEqual([
                '--configuration=/app/phpunit.xml',
            ]);
        });

        it('should parse long option with space value', () => {
            expect(parseArguments(['--configuration', '/app/phpunit.xml'], [])).toEqual([
                '--configuration=/app/phpunit.xml',
            ]);
        });

        it('should parse boolean flag', () => {
            expect(parseArguments(['--verbose'], [])).toEqual(['--verbose']);
        });

        it('should parse short option with alias expansion', () => {
            expect(parseArguments(['-c', '/app/phpunit.xml'], [])).toEqual([
                '--configuration=/app/phpunit.xml',
            ]);
        });

        it('should parse short option without alias', () => {
            expect(parseArguments(['-v'], [])).toEqual(['-v']);
        });

        it('should exclude specified options', () => {
            expect(
                parseArguments(
                    ['--teamcity', '--colors=never', '--verbose'],
                    ['teamcity', 'colors'],
                ),
            ).toEqual(['--verbose']);
        });

        it('should exclude option with space value', () => {
            expect(parseArguments(['--colors', 'never', '--verbose'], ['colors'])).toEqual([
                '--verbose',
            ]);
        });

        it('should exclude aliased short option', () => {
            expect(
                parseArguments(['-c', '/app/phpunit.xml', '--verbose'], ['configuration']),
            ).toEqual(['--verbose']);
        });

        it('should treat non-dash token after flag as its value', () => {
            expect(parseArguments(['--filter', 'test_passed'], [])).toEqual([
                '--filter=test_passed',
            ]);
        });

        it('should put options before positionals', () => {
            expect(parseArguments(['/path/to/test.php', '--verbose'], [])).toEqual([
                '--verbose',
                '/path/to/test.php',
            ]);
        });

        it('should strip single quotes from option values', () => {
            expect(parseArguments(["'--filter=test_passed'"], [])).toEqual([
                '--filter=test_passed',
            ]);
        });

        it('should strip double quotes from option values', () => {
            expect(parseArguments(['"--filter=test_passed"'], [])).toEqual([
                '--filter=test_passed',
            ]);
        });

        it('should strip single quotes from value after =', () => {
            expect(
                parseArguments(["--filter='^.*::(test_passed)( with data set .*)?$'"], []),
            ).toEqual(['--filter=^.*::(test_passed)( with data set .*)?$']);
        });

        it('should strip double quotes from value after =', () => {
            expect(
                parseArguments(['--filter="^.*::(test_passed)( with data set .*)?$"'], []),
            ).toEqual(['--filter=^.*::(test_passed)( with data set .*)?$']);
        });

        it('should join multiple parameters', () => {
            expect(parseArguments(['-c /app/phpunit.xml', '--verbose'], ['configuration'])).toEqual(
                ['--verbose'],
            );
        });

        it('should decode URI-encoded positionals', () => {
            expect(parseArguments(['tests%2FUnit'], [])).toEqual(['tests/Unit']);
        });
    });

    describe('checkFileExists', () => {
        it('should return true for existing file', async () => {
            expect(await checkFileExists(__filename)).toBe(true);
        });

        it('should return false for non-existing file', async () => {
            expect(await checkFileExists('/nonexistent/file.txt')).toBe(false);
        });
    });

    describe('findAsyncSequential', () => {
        it('should return first matching element', async () => {
            const result = await findAsyncSequential([1, 2, 3], async (n) => n === 2);
            expect(result).toBe(2);
        });

        it('should return undefined when no match', async () => {
            const result = await findAsyncSequential([1, 2, 3], async (n) => n === 5);
            expect(result).toBeUndefined();
        });
    });

    describe('capitalize', () => {
        it('should capitalize first letter', () => {
            expect(capitalize('hello')).toBe('Hello');
        });
    });

    describe('uncapitalize', () => {
        it('should uncapitalize first letter', () => {
            expect(uncapitalize('Hello')).toBe('hello');
        });
    });

    describe('snakeCase', () => {
        it('camelCase -> camel_case', () => {
            expect(snakeCase('camelCase')).toBe('camel_case');
        });

        it('PascalCase -> pascal_case', () => {
            expect(snakeCase('PascalCase')).toBe('pascal_case');
        });

        it('kebab-case -> kebab_case', () => {
            expect(snakeCase('kebab-case')).toBe('kebab_case');
        });
    });

    describe('camelCase', () => {
        it('snake_case -> snakeCase', () => {
            expect(camelCase('snake_case')).toBe('snakeCase');
        });

        it('kebab-case -> kebabCase', () => {
            expect(camelCase('kebab-case')).toBe('kebabCase');
        });
    });

    describe('title case', () => {
        it('NoNamespace -> No Namespace', () => {
            expect(titleCase('NoNamespace')).toEqual('No Namespace');
        });

        it('noNamespace -> No Namespace', () => {
            expect(titleCase('NoNamespace')).toEqual('No Namespace');
        });

        it('VSCode -> VSCode', () => {
            expect(titleCase('VSCode')).toEqual('VSCode');
        });

        it('Recca0120 -> Recca0120', () => {
            expect(titleCase('Recca0120')).toEqual('Recca0120');
        });

        it('Assertions2 -> Assertions2', () => {
            expect(titleCase('Assertions2')).toEqual('Assertions2');
        });

        it('snake_case -> Snake Case', () => {
            expect(titleCase('snake_case')).toEqual('Snake Case');
        });

        it('snake_case_AAA -> Snake Case AAA', () => {
            expect(titleCase('snake_case_AAA')).toEqual('Snake Case AAA');
        });

        it('snake_case Aaa -> Snake Case Aaa', () => {
            expect(titleCase('snake_case Aaa')).toEqual('Snake Case Aaa');
        });

        it('camelCase -> Camel Case', () => {
            expect(titleCase('camelCase')).toEqual('Camel Case');
        });

        it('PascalCase -> Pascal Case', () => {
            expect(titleCase('PascalCase')).toEqual('Pascal Case');
        });

        it('kebab-case -> Kebab-Case', () => {
            expect(titleCase('kebab-case')).toEqual('Kebab Case');
        });

        it('This is an HTML element -> This Is An HTML Element', () => {
            expect(titleCase('This is an HTML element')).toEqual('This Is An HTML Element');
        });
    });

    describe('splitFQN', () => {
        it('should split namespace and class', () => {
            expect(splitFQN('App\\Tests\\Unit\\MyTest')).toEqual({
                namespace: 'App\\Tests\\Unit',
                className: 'MyTest',
            });
        });

        it('should handle no namespace', () => {
            expect(splitFQN('MyTest')).toEqual({ namespace: '', className: 'MyTest' });
        });
    });

    describe('cloneInstance', () => {
        it('should create a copy with same prototype', () => {
            class Foo {
                constructor(public value: number) {}
                double() {
                    return this.value * 2;
                }
            }
            const original = new Foo(5);
            const clone = cloneInstance(original);

            expect(clone).not.toBe(original);
            expect(clone.value).toBe(5);
            expect(clone.double()).toBe(10);
            expect(clone).toBeInstanceOf(Foo);
        });

        it('should create a shallow copy', () => {
            class Bar {
                constructor(public data: { x: number }) {}
            }
            const original = new Bar({ x: 1 });
            const clone = cloneInstance(original);

            clone.data.x = 99;
            expect(original.data.x).toBe(99);
        });
    });
});
