import { execSync } from 'node:child_process';
import { platform, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { defineConfig } from '@vscode/test-cli';

const fixturesPath = resolve(import.meta.dirname, '../phpunit/tests/fixtures');
const mochaOpts = { ui: 'tdd', timeout: 30_000 };

// macOS caps AF_UNIX socket paths at 104 bytes; the default user-data-dir
// (nested under the checkout path, e.g. .../vscode-phpunit/vscode-phpunit/
// packages/extension/.vscode-test/user-data) can exceed that on CI runners
// and crash VS Code with "listen EINVAL". Force a short, fixed path instead.
// os.tmpdir() itself is too long on macOS (a per-process /var/folders/...
// path), so prefer the short, stable /tmp there.
function userDataDirArgs(label) {
    const base = platform() === 'darwin' ? '/tmp' : tmpdir();

    return ['--user-data-dir', join(base, 'vsc-e2e', label)];
}

function detectPhpUnitStubs() {
    const versions = [9, 10, 11, 12];
    const root = join(fixturesPath, 'phpunit-stub');

    return versions.flatMap((v) => {
        const binary = `v${v}/vendor/bin/phpunit`;
        try {
            execSync(`php ${binary} --version`, { cwd: root, timeout: 10000 });
            return [
                {
                    name: `v${v}`,
                    type: 'phpunit',
                    binary,
                    args: ['-c', join(root, `v${v}/phpunit.xml`)],
                    launchArgs: [root],
                },
            ];
        } catch {
            return [];
        }
    });
}

function detectPestStubs() {
    const versions = [2, 3, 4];
    const root = join(fixturesPath, 'pest-stub');

    return versions.flatMap((v) => {
        const binary = `v${v}/vendor/bin/pest`;
        try {
            execSync(`php ${binary} --version --test-directory=../tests`, {
                cwd: root,
                timeout: 10000,
            });
            return [
                {
                    name: `v${v}`,
                    type: 'pest',
                    binary,
                    args: ['-c', join(root, `v${v}/phpunit.xml`), '--test-directory=../tests'],
                    launchArgs: [root],
                },
            ];
        } catch {
            return [];
        }
    });
}

const phpUnitStubs = detectPhpUnitStubs();
const pestStubs = detectPestStubs();

const configs = [];

// PHPUnit single-folder (first available stub)
if (phpUnitStubs.length > 0) {
    const stub = phpUnitStubs[0];
    configs.push({
        label: `phpunit:${stub.name}`,
        files: 'out/tests/suite/**/*.test.js',
        mocha: mochaOpts,
        launchArgs: [
            ...stub.launchArgs,
            '--disable-extensions',
            ...userDataDirArgs(`phpunit-${stub.name}`),
        ],
        env: {
            STUB_TYPE: stub.type,
            STUB_VERSION: stub.name,
            STUB_BINARY: stub.binary,
            STUB_ARGS: JSON.stringify(stub.args),
        },
    });
}

// Pest single-folder (first available stub)
if (pestStubs.length > 0) {
    const stub = pestStubs[0];
    configs.push({
        label: `pest:${stub.name}`,
        files: 'out/tests/suite/**/*.test.js',
        mocha: mochaOpts,
        launchArgs: [
            ...stub.launchArgs,
            '--disable-extensions',
            ...userDataDirArgs(`pest-${stub.name}`),
        ],
        env: {
            STUB_TYPE: stub.type,
            STUB_VERSION: stub.name,
            STUB_BINARY: stub.binary,
            STUB_ARGS: JSON.stringify(stub.args),
        },
    });
}

// Multi-workspace test
if (phpUnitStubs.length > 0 && pestStubs.length > 0) {
    const phpUnit = phpUnitStubs[0];
    const pest = pestStubs[0];
    const workspacePath = join(fixturesPath, 'workspaces/multi-workspace.code-workspace');

    configs.push({
        label: 'multi-workspace',
        files: 'out/tests/suite-multi/**/*.test.js',
        mocha: mochaOpts,
        launchArgs: [
            workspacePath,
            '--disable-extensions',
            ...userDataDirArgs('multi-workspace'),
        ],
        env: {
            PHPUNIT_STUB_VERSION: phpUnit.name,
            PHPUNIT_STUB_BINARY: phpUnit.binary,
            PHPUNIT_STUB_ARGS: JSON.stringify(phpUnit.args),
            PEST_STUB_VERSION: pest.name,
            PEST_STUB_BINARY: pest.binary,
            PEST_STUB_ARGS: JSON.stringify(pest.args),
        },
    });
}

// Issue #381 test
const issue381Root = join(fixturesPath, 'issue-381/php-project');
const issue381Binary = 'vendor/bin/phpunit';
try {
    execSync(`php ${issue381Binary} --version`, { cwd: issue381Root, timeout: 10000 });
    const workspacePath = join(fixturesPath, 'workspaces/issue-381-workspace.code-workspace');

    configs.push({
        label: 'issue-381',
        files: 'out/tests/suite-issue-381/**/*.test.js',
        mocha: mochaOpts,
        launchArgs: [workspacePath, '--disable-extensions', ...userDataDirArgs('issue-381')],
        env: {
            ISSUE381_PHPUNIT_BINARY: issue381Binary,
        },
    });
} catch {
    // skip if phpunit not available
}

export default defineConfig(configs);
