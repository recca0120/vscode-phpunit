import { phpUnitProject } from '../__tests__/utils';
import { PathReplacer } from './PathReplacer';

describe('PathReplacer', () => {
    // php_qn://./tests/AssertionsTest.php::\Recca0120\VSCode\Tests\AssertionsTest::test_passed
    // php_qn://C:\vscode\tests\AssertionsTest.php::\Recca0120\VSCode\Tests\AssertionsTest::test_passed
    // ./tests/AssertionsTest.php
    // C:\vscode\tests\AssertionsTest.php
    // php_qn://./tests/AssertionsTest.php::\Recca0120\VSCode\Tests\AssertionsTest
    // php_qn://C:\vscode\tests\AssertionsTest.php::\Recca0120\VSCode\Tests\AssertionsTest
    // php_qn://./tests/AssertionsTest.php::\Recca0120\VSCode\Tests\AssertionsTest::test_failed
    // php_qn://C:\vscode\tests\AssertionsTest.php::\Recca0120\VSCode\Tests\AssertionsTest::test_failed
    // phpvfscomposer://./vendor/phpunit/phpunit/phpunit
    // C:\vscode\vendor\phpunit\phpunit\phpunit
    // C:\vscode\tests\AssertionsTest.php
    // ./tests/AssertionsTest.php

    describe('posix', () => {
        const cwd = phpUnitProject('');

        const pathReplacer = new PathReplacer({ cwd }, {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${workspaceFolder}': '/app',
        });

        describe('posix local to remote', () => {
            it('posix replace local path to remote path', () => {
                const path = phpUnitProject('tests/AssertionsTest.php');

                expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
            });

            it('posix replace ${workspaceFolder} to remote path', () => {
                const path = '${workspaceFolder}/tests/AssertionsTest.php';

                expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
            });

            it('posix replace ${PWD} to remote path', () => {
                const path = '${PWD}/tests/AssertionsTest.php';

                expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
            });
        });

        describe('posix remote to local', () => {
            it('posix same path', () => {
                const path = phpUnitProject('tests/AssertionsTest.php');

                expect(pathReplacer.toLocal(path)).toEqual(path);
            });

            it('posix replace remote path to local path', () => {
                const path = '/app/tests/AssertionsTest.php';

                expect(pathReplacer.toLocal(path)).toEqual(phpUnitProject('tests/AssertionsTest.php'));
            });

            it('posix replace php_qn remote path to php_qn local path', () => {
                const path = 'php_qn:///app/tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

                expect(pathReplacer.toLocal(path)).toEqual(`php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`);
            });

            it('posix replace phpvfscomposer remote path to local path', () => {
                const path = 'phpvfscomposer:///app/vendor/phpunit/phpunit/phpunit';

                expect(pathReplacer.toLocal(path)).toEqual(phpUnitProject('vendor/phpunit/phpunit/phpunit'));
            });
        });
    });

    describe('windows', () => {
        const toWindows = (path: string) => path.replace(/\//g, '\\').replace(/\\$/g, '');

        const cwd = toWindows(phpUnitProject(''));

        const pathReplacer = new PathReplacer({ cwd }, {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${workspaceFolder}': '/app',
        });

        describe('windows local to remote', () => {
            it('windows replace local path to remote path', () => {
                const path = toWindows(phpUnitProject('tests/AssertionsTest.php'));

                expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
            });

            it('windows replace ${workspaceFolder} to remote path', () => {
                const path = toWindows('${workspaceFolder}/tests/AssertionsTest.php');

                expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
            });

            it('windows replace ${PWD} to remote path', () => {
                const path = toWindows('${PWD}/tests/AssertionsTest.php');

                expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
            });
        });

        // describe('remote to local', () => {
        //     it('same path', () => {
        //         const path = phpUnitProject('tests/AssertionsTest.php');
        //
        //         expect(pathReplacer.toLocal(path)).toEqual(toWindows(path));
        //     });
        //
        //     fit('replace remote path to local path', () => {
        //         const path = '/app/tests/AssertionsTest.php';
        //
        //         expect(pathReplacer.toLocal(path)).toEqual(toWindows(phpUnitProject('tests/AssertionsTest.php')));
        //     });
        //
        //     it('replace php_qn remote path to php_qn local path', () => {
        //         const path = 'php_qn:///app/tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';
        //
        //         expect(pathReplacer.toLocal(path)).toEqual(`php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`);
        //     });
        //
        //     it('replace phpvfscomposer remote path to local path', () => {
        //         const path = 'phpvfscomposer:///app/vendor/phpunit/phpunit/phpunit';
        //
        //         expect(pathReplacer.toLocal(path)).toEqual(phpUnitProject('vendor/phpunit/phpunit/phpunit'));
        //     });
        // });
    });
});