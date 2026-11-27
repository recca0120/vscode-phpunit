import { describe, expect, it } from 'vitest';
import { parseArguments, parseArgv } from './arguments';

describe('arguments', () => {
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
                    ['--teamcity', '--colors=always', '--verbose'],
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
});
