import { describe, expect, it } from 'vitest';
import { givenCommand } from '../../tests/support/testCommand';
import { toLocalResult } from './toLocalResult';
import { TeamcityEvent, type TestFailed } from './types';

describe('toLocalResult', () => {
    it('maps only whole path segments back to the local path', () => {
        const command = givenCommand(
            { command: 'docker exec app', paths: { '/Users/me/app': '/var/www' } },
            '/Users/me/app',
        );

        const result = toLocalResult(
            {
                event: TeamcityEvent.testFailed,
                name: 'test_a',
                flowId: 1,
                id: 'Tests\\FooTest::test_a',
                file: '/var/www/tests/FooTest.php',
                locationHint: 'php_qn:///var/www/tests/FooTest.php::\\Tests\\FooTest::test_a',
                message: '',
                details: [
                    { file: '/var/www/tests/FooTest.php', line: 7 },
                    { file: '/var/www-shared/src/Helper.php', line: 3 },
                ],
                duration: 0,
            } as TestFailed,
            command.paths,
        );

        expect(result).toMatchObject({
            file: '/Users/me/app/tests/FooTest.php',
            details: [
                { file: '/Users/me/app/tests/FooTest.php', line: 7 },
                { file: '/var/www-shared/src/Helper.php', line: 3 },
            ],
        });
    });
});
