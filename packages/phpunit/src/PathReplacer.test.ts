import os from 'node:os';
import { describe, expect, it } from 'vitest';
import { phpUnitProject, phpUnitProjectWin } from '../tests/utils';
import {
    VAR_PATH_SEPARATOR,
    VAR_PATH_SEPARATOR_SHORT,
    VAR_PWD,
    VAR_USER_HOME,
    VAR_WORKSPACE_FOLDER,
    VAR_WORKSPACE_FOLDER_BASENAME,
} from './constants';
import { PathReplacer } from './PathReplacer';

describe('PathReplacer', () => {
    const givenPathReplacer = (paths?: Record<string, string>, cwd?: string) => {
        return new PathReplacer(
            { cwd: cwd ?? phpUnitProject('') },
            paths ?? {
                [VAR_WORKSPACE_FOLDER]: '/app',
            },
        );
    };

    const toWindows = (path: string) => path.replace(/\//g, '\\').replace(/\\$/g, '');

    const givenPathReplacerForWindows = (paths?: Record<string, string>, cwd?: string) => {
        return new PathReplacer(
            { cwd: cwd ?? phpUnitProjectWin('') },
            paths ?? {
                [VAR_WORKSPACE_FOLDER]: '/app',
            },
        );
    };

    it('to remote same path', () => {
        const pathReplacer = givenPathReplacer();

        const path = phpUnitProject('tests/AssertionsTest.php');

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it('to remote replace . to /app/', () => {
        const pathReplacer = givenPathReplacer();

        const path = './tests/AssertionsTest.php';

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it(`to remote replace ${VAR_WORKSPACE_FOLDER} to /app/`, () => {
        const pathReplacer = givenPathReplacer();

        const path = `${VAR_WORKSPACE_FOLDER}/tests/AssertionsTest.php`;

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it(`to remote replace ${VAR_PWD} to /app/`, () => {
        const pathReplacer = givenPathReplacer();

        const path = `${VAR_PWD}/tests/AssertionsTest.php`;

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it('to local same path', () => {
        const pathReplacer = givenPathReplacer();

        const path = phpUnitProject('tests/AssertionsTest.php');

        expect(pathReplacer.toLocal(path)).toEqual(path);
    });

    it('to local replace /app/ to project root', () => {
        const pathReplacer = givenPathReplacer();

        const path = '/app/tests/AssertionsTest.php';

        expect(pathReplacer.toLocal(path)).toEqual(phpUnitProject('tests/AssertionsTest.php'));
    });

    it('to local replace . to project root', () => {
        const pathReplacer = givenPathReplacer();

        const path = './tests/AssertionsTest.php';

        expect(pathReplacer.toLocal(path)).toEqual(phpUnitProject('tests/AssertionsTest.php'));
    });

    it('to local replace /app/ to project root with php_qn', () => {
        const pathReplacer = givenPathReplacer();

        const path =
            'php_qn:///app/tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

        expect(pathReplacer.toLocal(path)).toEqual(
            `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`,
        );
    });

    it('to local replace . to project root with php_qn', () => {
        const pathReplacer = givenPathReplacer();

        const path =
            'php_qn://./tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

        expect(pathReplacer.toLocal(path)).toEqual(
            `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`,
        );
    });

    it('to local replace /app/ to project root with phpvfscomposer', () => {
        const pathReplacer = givenPathReplacer();

        const path = 'phpvfscomposer:///app/vendor/phpunit/phpunit/phpunit';

        expect(pathReplacer.toLocal(path)).toEqual(
            phpUnitProject('vendor/phpunit/phpunit/phpunit'),
        );
    });

    it('to remote same path for windows', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = phpUnitProjectWin('tests/AssertionsTest.php');

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it(`to remote replace ${VAR_WORKSPACE_FOLDER} to /app/ for windows`, () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = toWindows(`${VAR_WORKSPACE_FOLDER}/tests/AssertionsTest.php`);

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it(`to remote replace ${VAR_PWD} to /app/ for windows`, () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = toWindows(`${VAR_PWD}/tests/AssertionsTest.php`);

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it('remote same path for windows', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = phpUnitProjectWin('tests/AssertionsTest.php');

        expect(pathReplacer.toLocal(path)).toEqual(path);
    });

    it('to local replace . to project root', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = './tests/AssertionsTest.php';

        expect(pathReplacer.toLocal(path)).toEqual(phpUnitProjectWin('tests/AssertionsTest.php'));
    });

    it('to local replace /app/ to project root for windows', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = '/app/tests/AssertionsTest.php';

        expect(pathReplacer.toLocal(path)).toEqual(phpUnitProjectWin('tests/AssertionsTest.php'));
    });

    it('to local replace /app/ to project root with php_qn for windows', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path =
            'php_qn:///app/tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

        expect(pathReplacer.toLocal(path)).toEqual(
            `php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`,
        );
    });

    it('to local replace /app/ to project root with phpvfscomposer for windows', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = 'phpvfscomposer:///app/vendor/phpunit/phpunit/phpunit';

        expect(pathReplacer.toLocal(path)).toEqual(
            phpUnitProjectWin('vendor/phpunit/phpunit/phpunit'),
        );
    });

    it(`to remote replace ${VAR_WORKSPACE_FOLDER} is . for windows`, () => {
        const pathReplacer = givenPathReplacerForWindows({
            [VAR_WORKSPACE_FOLDER]: '.',
        });

        const path = `${VAR_PWD}/phpunit.xml`;

        expect(pathReplacer.toRemote(path)).toEqual('./phpunit.xml');
    });

    it('to local should not corrupt paths containing ../ when remote is .', () => {
        const pathReplacer = givenPathReplacer({
            [VAR_WORKSPACE_FOLDER]: '.',
        });

        const path = '/abc/../def/Foo.php';

        expect(pathReplacer.toLocal(path)).toEqual('/abc/../def/Foo.php');
    });

    it(`to local replace ${VAR_WORKSPACE_FOLDER} is . for windows`, () => {
        const pathReplacer = givenPathReplacerForWindows({
            [VAR_WORKSPACE_FOLDER]: '.',
        });

        const path = './tests/AssertionsTest.php';

        expect(pathReplacer.toLocal(path)).toEqual(phpUnitProjectWin('tests/AssertionsTest.php'));
    });

    it(`replaces ${VAR_WORKSPACE_FOLDER_BASENAME} in paths value`, () => {
        const pathReplacer = new PathReplacer(
            { cwd: phpUnitProject('') },
            { [VAR_WORKSPACE_FOLDER]: `/${VAR_WORKSPACE_FOLDER_BASENAME}` },
        );

        expect(pathReplacer.toRemote(phpUnitProject('tests/AssertionsTest.php'))).toEqual(
            '/phpunit-stub/tests/AssertionsTest.php',
        );
    });

    it(`replaces ${VAR_USER_HOME} in paths value`, () => {
        const pathReplacer = new PathReplacer(
            { cwd: phpUnitProject('') },
            { [VAR_WORKSPACE_FOLDER]: `${VAR_USER_HOME}/app` },
        );

        const expected =
            process.platform === 'win32'
                ? `${os.homedir()}\\app\\tests\\AssertionsTest.php`
                : `${os.homedir()}/app/tests/AssertionsTest.php`;

        expect(pathReplacer.toRemote(phpUnitProject('tests/AssertionsTest.php'))).toEqual(expected);
    });

    it(`replaces ${VAR_PATH_SEPARATOR} in paths value`, () => {
        const pathReplacer = new PathReplacer(
            { cwd: phpUnitProject('') },
            { [VAR_WORKSPACE_FOLDER]: `/app${VAR_PATH_SEPARATOR}sub` },
        );

        // posixPath normalises backslashes for non-drive-letter paths on all platforms
        expect(pathReplacer.toRemote(phpUnitProject('tests/AssertionsTest.php'))).toEqual(
            `/app/sub/tests/AssertionsTest.php`,
        );
    });

    it(`replaces ${VAR_PATH_SEPARATOR_SHORT} in paths value`, () => {
        const pathReplacer = new PathReplacer(
            { cwd: phpUnitProject('') },
            { [VAR_WORKSPACE_FOLDER]: `/app${VAR_PATH_SEPARATOR_SHORT}sub` },
        );

        // posixPath normalises backslashes for non-drive-letter paths on all platforms
        expect(pathReplacer.toRemote(phpUnitProject('tests/AssertionsTest.php'))).toEqual(
            `/app/sub/tests/AssertionsTest.php`,
        );
    });

    it(`can't replace path when ${VAR_WORKSPACE_FOLDER} is /`, () => {
        const pathReplacer = givenPathReplacer(
            {
                [VAR_WORKSPACE_FOLDER]: '/app',
            },
            '/',
        );

        const localPath = phpUnitProject('tests/AssertionsTest.php');
        expect(pathReplacer.toRemote(localPath)).toEqual(localPath);

        const remotePath = '/app/tests/AssertionsTest.php';
        expect(pathReplacer.toLocal(remotePath)).toEqual(remotePath);
    });
});
