import { phpUnitProject, phpUnitProjectWin } from '../__tests__/utils';
import { PathReplacer } from './PathReplacer';

describe('PathReplacer', () => {
    const givenPathReplacer = (paths?: any, cwd?: string) => {
        return new PathReplacer({ cwd: cwd ?? phpUnitProject('') }, paths ?? {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${workspaceFolder}': '/app',
        });
    };

    const toWindows = (path: string) => path.replace(/\//g, '\\').replace(/\\$/g, '');

    const givenPathReplacerForWindows = (paths?: any, cwd?: string) => {
        return new PathReplacer({ cwd: cwd ?? phpUnitProjectWin('') }, paths ?? {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${workspaceFolder}': '/app',
        });
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

    it('to remote replace ${workspaceFolder} to /app/', () => {
        const pathReplacer = givenPathReplacer();

        const path = '${workspaceFolder}/tests/AssertionsTest.php';

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it('to remote replace ${PWD} to /app/', () => {
        const pathReplacer = givenPathReplacer();

        const path = '${PWD}/tests/AssertionsTest.php';

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

        const path = 'php_qn:///app/tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

        expect(pathReplacer.toLocal(path)).toEqual(`php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`);
    });

    it('to local replace . to project root with php_qn', () => {
        const pathReplacer = givenPathReplacer();

        const path = 'php_qn://./tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

        expect(pathReplacer.toLocal(path)).toEqual(`php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`);
    });

    it('to local replace /app/ to project root with phpvfscomposer', () => {
        const pathReplacer = givenPathReplacer();

        const path = 'phpvfscomposer:///app/vendor/phpunit/phpunit/phpunit';

        expect(pathReplacer.toLocal(path)).toEqual(phpUnitProject('vendor/phpunit/phpunit/phpunit'));
    });

    it('to remote same path for windows', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = phpUnitProjectWin('tests/AssertionsTest.php');

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it('to remote replace ${workspaceFolder} to /app/ for windows', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = toWindows('${workspaceFolder}/tests/AssertionsTest.php');

        expect(pathReplacer.toRemote(path)).toEqual('/app/tests/AssertionsTest.php');
    });

    it('to remote replace ${PWD} to /app/ for windows', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = toWindows('${PWD}/tests/AssertionsTest.php');

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

        const path = 'php_qn:///app/tests/AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest';

        expect(pathReplacer.toLocal(path)).toEqual(`php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`);
    });

    it('to local replace /app/ to project root with phpvfscomposer for windows', () => {
        const pathReplacer = givenPathReplacerForWindows();

        const path = 'phpvfscomposer:///app/vendor/phpunit/phpunit/phpunit';

        expect(pathReplacer.toLocal(path)).toEqual(phpUnitProjectWin('vendor/phpunit/phpunit/phpunit'));
    });

    it('to remote replace ${workspaceFolder} is . for windows', () => {
        const pathReplacer = givenPathReplacerForWindows({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${workspaceFolder}': '.',
        });

        const path = '${PWD}/phpunit.xml';

        expect(pathReplacer.toRemote(path)).toEqual('./phpunit.xml');
    });

    it('to local replace ${workspaceFolder} is . for windows', () => {
        const pathReplacer = givenPathReplacerForWindows({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${workspaceFolder}': '.',
        });

        const path = './tests/AssertionsTest.php';

        expect(pathReplacer.toLocal(path)).toEqual('C:\\vscode\\tests\\AssertionsTest.php');
    });

    it('can\'t replace path when ${workspaceFolder} is /', () => {
        const pathReplacer = givenPathReplacer({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${workspaceFolder}': '/app',
        }, '/');

        const localPath = phpUnitProject('tests/AssertionsTest.php');
        expect(pathReplacer.toRemote(localPath)).toEqual(localPath);

        const remotePath = '/app/tests/AssertionsTest.php';
        expect(pathReplacer.toLocal(remotePath)).toEqual(remotePath);
    });
});