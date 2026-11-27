import os from 'node:os';
import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/support/fixtures';
import { phpUnitProjectWin } from '../../tests/support/windowsPath';
import {
    VAR_PATH_SEPARATOR,
    VAR_PATH_SEPARATOR_SHORT,
    VAR_PWD,
    VAR_USER_HOME,
    VAR_WORKSPACE_FOLDER,
    VAR_WORKSPACE_FOLDER_BASENAME,
} from '../constants';
import { RemotePathMapper } from './RemotePathMapper';

describe('RemotePathMapper', () => {
    const givenPathReplacer = (
        paths?: Record<string, string>,
        cwd?: string,
        workspaceFolder?: string,
    ) => {
        return new RemotePathMapper(
            { cwd: cwd ?? phpUnitProject('') },
            paths ?? {
                [VAR_WORKSPACE_FOLDER]: '/app',
            },
            workspaceFolder,
        );
    };

    const toWindows = (path: string) => path.replace(/\//g, '\\').replace(/\\$/g, '');

    const givenPathReplacerForWindows = (
        paths?: Record<string, string>,
        cwd?: string,
        workspaceFolder?: string,
    ) => {
        return new RemotePathMapper(
            { cwd: cwd ?? phpUnitProjectWin('') },
            paths ?? {
                [VAR_WORKSPACE_FOLDER]: '/app',
            },
            workspaceFolder,
        );
    };

    it('to remote same path', () => {
        const remotePathMapper = givenPathReplacer();

        const path = phpUnitProject('tests/AssertionsTest.php');

        expect(remotePathMapper.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it('to remote replace . to /app/', () => {
        const remotePathMapper = givenPathReplacer();

        const path = './tests/AssertionsTest.php';

        expect(remotePathMapper.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it(`to remote replace ${VAR_WORKSPACE_FOLDER} to /app/`, () => {
        const remotePathMapper = givenPathReplacer();

        const path = `${VAR_WORKSPACE_FOLDER}/tests/AssertionsTest.php`;

        expect(remotePathMapper.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it(`to remote replace ${VAR_PWD} to /app/`, () => {
        const remotePathMapper = givenPathReplacer();

        const path = `${VAR_PWD}/tests/AssertionsTest.php`;

        expect(remotePathMapper.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it('to local same path', () => {
        const remotePathMapper = givenPathReplacer();

        const path = phpUnitProject('tests/AssertionsTest.php');

        expect(remotePathMapper.toLocal(path)).toEqual(path);
    });

    it('to local replace /app/ to project root', () => {
        const remotePathMapper = givenPathReplacer();

        const path = '/app/tests/AssertionsTest.php';

        expect(remotePathMapper.toLocal(path)).toEqual(phpUnitProject('tests/AssertionsTest.php'));
    });

    it('to local replace . to project root', () => {
        const remotePathMapper = givenPathReplacer();

        const path = './tests/AssertionsTest.php';

        expect(remotePathMapper.toLocal(path)).toEqual(phpUnitProject('tests/AssertionsTest.php'));
    });

    it('to local replace /app/ to project root with php_qn', () => {
        const remotePathMapper = givenPathReplacer();

        const path =
            'php_qn:///app/tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

        expect(remotePathMapper.toLocal(path)).toEqual(
            `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`,
        );
    });

    it('to local replace . to project root with php_qn', () => {
        const remotePathMapper = givenPathReplacer();

        const path =
            'php_qn://./tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

        expect(remotePathMapper.toLocal(path)).toEqual(
            `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`,
        );
    });

    it('to local replace /app/ to project root with phpvfscomposer', () => {
        const remotePathMapper = givenPathReplacer();

        const path = 'phpvfscomposer:///app/vendor/phpunit/phpunit/phpunit';

        expect(remotePathMapper.toLocal(path)).toEqual(
            phpUnitProject('vendor/phpunit/phpunit/phpunit'),
        );
    });

    it('to remote same path for windows', () => {
        const remotePathMapper = givenPathReplacerForWindows();

        const path = phpUnitProjectWin('tests/AssertionsTest.php');

        expect(remotePathMapper.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it(`to remote replace ${VAR_WORKSPACE_FOLDER} to /app/ for windows`, () => {
        const remotePathMapper = givenPathReplacerForWindows();

        const path = toWindows(`${VAR_WORKSPACE_FOLDER}/tests/AssertionsTest.php`);

        expect(remotePathMapper.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it(`to remote replace ${VAR_PWD} to /app/ for windows`, () => {
        const remotePathMapper = givenPathReplacerForWindows();

        const path = toWindows(`${VAR_PWD}/tests/AssertionsTest.php`);

        expect(remotePathMapper.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it('remote same path for windows', () => {
        const remotePathMapper = givenPathReplacerForWindows();

        const path = phpUnitProjectWin('tests/AssertionsTest.php');

        expect(remotePathMapper.toLocal(path)).toEqual(path);
    });

    it('to local replace . to project root for windows', () => {
        const remotePathMapper = givenPathReplacerForWindows();

        const path = './tests/AssertionsTest.php';

        expect(remotePathMapper.toLocal(path)).toEqual(
            phpUnitProjectWin('tests/AssertionsTest.php'),
        );
    });

    it('to local replace /app/ to project root for windows', () => {
        const remotePathMapper = givenPathReplacerForWindows();

        const path = '/app/tests/AssertionsTest.php';

        expect(remotePathMapper.toLocal(path)).toEqual(
            phpUnitProjectWin('tests/AssertionsTest.php'),
        );
    });

    it('to local replace /app/ to project root with php_qn for windows', () => {
        const remotePathMapper = givenPathReplacerForWindows();

        const path =
            'php_qn:///app/tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

        expect(remotePathMapper.toLocal(path)).toEqual(
            `php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`,
        );
    });

    it('to local replace /app/ to project root with phpvfscomposer for windows', () => {
        const remotePathMapper = givenPathReplacerForWindows();

        const path = 'phpvfscomposer:///app/vendor/phpunit/phpunit/phpunit';

        expect(remotePathMapper.toLocal(path)).toEqual(
            phpUnitProjectWin('vendor/phpunit/phpunit/phpunit'),
        );
    });

    it(`to remote replace ${VAR_WORKSPACE_FOLDER} is . for windows`, () => {
        const remotePathMapper = givenPathReplacerForWindows({
            [VAR_WORKSPACE_FOLDER]: '.',
        });

        const path = `${VAR_PWD}/phpunit.xml`;

        expect(remotePathMapper.toRemote(path)).toEqual('./phpunit.xml');
    });

    it('to local should not corrupt paths containing ../ when remote is .', () => {
        const remotePathMapper = givenPathReplacer({
            [VAR_WORKSPACE_FOLDER]: '.',
        });

        const path = '/abc/../def/Foo.php';

        expect(remotePathMapper.toLocal(path)).toEqual('/abc/../def/Foo.php');
    });

    it(`to local replace ${VAR_WORKSPACE_FOLDER} is . for windows`, () => {
        const remotePathMapper = givenPathReplacerForWindows({
            [VAR_WORKSPACE_FOLDER]: '.',
        });

        const path = './tests/AssertionsTest.php';

        expect(remotePathMapper.toLocal(path)).toEqual(
            phpUnitProjectWin('tests/AssertionsTest.php'),
        );
    });

    describe('URI schemes are not treated as Windows drive letters', () => {
        it('to local keeps relative pest_qn locationHint untouched', () => {
            const path = 'pest_qn://tests/Unit/ExampleTest.php::it works';

            expect(givenPathReplacer().toLocal(path)).toEqual(path);
            expect(givenPathReplacerForWindows().toLocal(path)).toEqual(path);
        });

        it('to local replace /app/ to project root with pest_qn', () => {
            const path = 'pest_qn:///app/tests/Unit/ExampleTest.php::it works';

            expect(givenPathReplacer().toLocal(path)).toEqual(
                `pest_qn://${phpUnitProject('tests/Unit/ExampleTest.php')}::it works`,
            );
        });

        it('to remote keeps URL arguments untouched', () => {
            const arg = '--log-junit=http://example.com/a/b';

            expect(givenPathReplacer().toRemote(arg)).toEqual(arg);
            expect(givenPathReplacerForWindows().toRemote(arg)).toEqual(arg);
        });
    });

    it(`replaces ${VAR_WORKSPACE_FOLDER_BASENAME} in paths value`, () => {
        const remotePathMapper = new RemotePathMapper(
            { cwd: phpUnitProject('') },
            { [VAR_WORKSPACE_FOLDER]: `/${VAR_WORKSPACE_FOLDER_BASENAME}` },
        );

        expect(remotePathMapper.toRemote(phpUnitProject('tests/AssertionsTest.php'))).toEqual(
            '/phpunit-stub/tests/AssertionsTest.php',
        );
    });

    it(`replaces ${VAR_USER_HOME} in paths value`, () => {
        const remotePathMapper = new RemotePathMapper(
            { cwd: phpUnitProject('') },
            { [VAR_WORKSPACE_FOLDER]: `${VAR_USER_HOME}/app` },
        );

        const expected =
            process.platform === 'win32'
                ? `${os.homedir()}\\app\\tests\\AssertionsTest.php`
                : `${os.homedir()}/app/tests/AssertionsTest.php`;

        expect(remotePathMapper.toRemote(phpUnitProject('tests/AssertionsTest.php'))).toEqual(
            expected,
        );
    });

    it(`replaces ${VAR_PATH_SEPARATOR} in paths value`, () => {
        const remotePathMapper = new RemotePathMapper(
            { cwd: phpUnitProject('') },
            { [VAR_WORKSPACE_FOLDER]: `/app${VAR_PATH_SEPARATOR}sub` },
        );

        expect(remotePathMapper.toRemote(phpUnitProject('tests/AssertionsTest.php'))).toEqual(
            `/app/sub/tests/AssertionsTest.php`,
        );
    });

    it(`replaces ${VAR_PATH_SEPARATOR_SHORT} in paths value`, () => {
        const remotePathMapper = new RemotePathMapper(
            { cwd: phpUnitProject('') },
            { [VAR_WORKSPACE_FOLDER]: `/app${VAR_PATH_SEPARATOR_SHORT}sub` },
        );

        expect(remotePathMapper.toRemote(phpUnitProject('tests/AssertionsTest.php'))).toEqual(
            `/app/sub/tests/AssertionsTest.php`,
        );
    });

    it(`can't replace path when ${VAR_WORKSPACE_FOLDER} is /`, () => {
        const remotePathMapper = givenPathReplacer(
            {
                [VAR_WORKSPACE_FOLDER]: '/app',
            },
            '/',
        );

        const localPath = phpUnitProject('tests/AssertionsTest.php');
        expect(remotePathMapper.toRemote(localPath)).toEqual(localPath);

        const remotePath = '/app/tests/AssertionsTest.php';
        expect(remotePathMapper.toLocal(remotePath)).toEqual(remotePath);
    });

    describe('workspaceFolder differs from cwd (monorepo / nested config)', () => {
        const workspace = '/workspace';
        const cwd = '/workspace/apps/api';

        it(`replaces ${VAR_WORKSPACE_FOLDER} with workspaceFolder, not cwd`, () => {
            const remotePathMapper = new RemotePathMapper({ cwd }, undefined, workspace);

            expect(
                remotePathMapper.toRemote(`${VAR_WORKSPACE_FOLDER}/apps/api/phpunit.xml.dist`),
            ).toEqual('/workspace/apps/api/phpunit.xml.dist');
        });

        it(`replaces ${VAR_WORKSPACE_FOLDER_BASENAME} with basename of workspaceFolder, not cwd`, () => {
            const remotePathMapper = new RemotePathMapper({ cwd }, undefined, workspace);

            expect(remotePathMapper.resolveVariables(`${VAR_WORKSPACE_FOLDER_BASENAME}`)).toEqual(
                'workspace',
            );
        });

        it(`replaces ${VAR_PWD} with cwd, not workspaceFolder`, () => {
            const remotePathMapper = new RemotePathMapper({ cwd }, undefined, workspace);

            expect(remotePathMapper.toRemote(`${VAR_PWD}/vendor/bin/phpunit`)).toEqual(
                '/workspace/apps/api/vendor/bin/phpunit',
            );
        });

        it(`does not double-nest path when ${VAR_WORKSPACE_FOLDER} contains subdirectory`, () => {
            const remotePathMapper = new RemotePathMapper({ cwd }, undefined, workspace);

            const result = remotePathMapper.toRemote(
                `${VAR_WORKSPACE_FOLDER}/apps/api/vendor/bin/phpunit`,
            );

            expect(result).toEqual('/workspace/apps/api/vendor/bin/phpunit');
            expect(result).not.toContain('apps/api/apps/api');
        });

        it(`produces duplicated path segments when workspaceFolder is not provided`, () => {
            const remotePathMapper = new RemotePathMapper({ cwd });

            expect(
                remotePathMapper.toRemote(`${VAR_WORKSPACE_FOLDER}/apps/api/phpunit.xml.dist`),
            ).toEqual('/workspace/apps/api/apps/api/phpunit.xml.dist');
        });
    });
});
