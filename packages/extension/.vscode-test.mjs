import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { defineConfig } from '@vscode/test-cli';

const fixturesPath = resolve(import.meta.dirname, '../phpunit/tests/fixtures');
const mochaOpts = { ui: 'tdd', timeout: 30_000 };

function userDataDirArgs(label) {
    const base = platform() === 'darwin' ? (process.env.RUNNER_TEMP ?? '/tmp') : tmpdir();

    return ['--user-data-dir', join(base, 'vsc-e2e', label)];
}

function temporaryWorkspace(source) {
    const workspace = JSON.parse(readFileSync(source, 'utf8'));
    workspace.folders = workspace.folders.map((folder) => ({
        ...folder,
        path: resolve(dirname(source), folder.path),
    }));
    const target = join(mkdtempSync(join(tmpdir(), 'vsc-e2e-workspace-')), basename(source));
    writeFileSync(target, JSON.stringify(workspace, null, 4));

    return target;
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

function watchingWorkspace(name, files) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), `vsc-e2e-${name}-`)));
    for (const [file, content] of Object.entries(files)) {
        mkdirSync(dirname(join(root, file)), { recursive: true });
        writeFileSync(join(root, file), content);
    }

    return root;
}

const testsuite = (directory) => `<?xml version="1.0" encoding="UTF-8"?>
<phpunit>
    <testsuites>
        <testsuite name="default">
            <directory>${directory}</directory>
        </testsuite>
    </testsuites>
</phpunit>
`;

const testCase = (name) => `<?php

use PHPUnit\\Framework\\TestCase;

class ${name} extends TestCase
{
    public function test_it_works(): void
    {
        $this->assertTrue(true);
    }
}
`;

const phpUnitStubs = detectPhpUnitStubs();
const pestStubs = detectPestStubs();

const configs = [];

if (phpUnitStubs.length > 0) {
    const stub = phpUnitStubs.at(-1);
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

if (pestStubs.length > 0) {
    const stub = pestStubs.at(-1);
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

if (phpUnitStubs.length > 0 && pestStubs.length > 0) {
    const phpUnit = phpUnitStubs.at(-1);
    const pest = pestStubs.at(-1);
    const workspacePath = join(fixturesPath, 'workspaces/multi-workspace.code-workspace');

    configs.push({
        label: 'multi-workspace',
        files: 'out/tests/suite-multi/**/*.test.js',
        mocha: mochaOpts,
        launchArgs: [workspacePath, '--disable-extensions', ...userDataDirArgs('multi-workspace')],
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

if (phpUnitStubs.length > 0) {
    const stub = phpUnitStubs.at(-1);
    const root = join(fixturesPath, 'phpunit-regressions');
    configs.push({
        label: 'regressions:phpunit',
        files: 'out/tests/suite-regressions/**/*.test.js',
        mocha: mochaOpts,
        launchArgs: [root, '--disable-extensions', ...userDataDirArgs('regressions-phpunit')],
        env: {
            STUB_TYPE: 'phpunit',
            STUB_VERSION: stub.name,
            STUB_BINARY: `../phpunit-stub/${stub.binary}`,
            STUB_ARGS: JSON.stringify(['-c', join(root, 'regressions/phpunit.xml')]),
            EXPECTED_TEST_COUNT: '14',
        },
    });
}

if (pestStubs.length > 0) {
    const stub = pestStubs.at(-1);
    const root = join(fixturesPath, 'pest-stub');
    configs.push({
        label: 'regressions:pest',
        files: 'out/tests/suite-regressions/**/*.test.js',
        mocha: mochaOpts,
        launchArgs: [root, '--disable-extensions', ...userDataDirArgs('regressions-pest')],
        env: {
            STUB_TYPE: 'pest',
            STUB_VERSION: stub.name,
            STUB_BINARY: stub.binary,
            STUB_ARGS: JSON.stringify([
                '-c',
                join(root, `${stub.name}/phpunit.regressions.xml`),
                '--test-directory=../tests',
            ]),
            EXPECTED_TEST_COUNT: '1',
        },
    });
}

if (phpUnitStubs.length > 0) {
    const stub = phpUnitStubs.at(-1);
    const phpunit = join(fixturesPath, 'phpunit-stub', stub.binary);
    const root = watchingWorkspace('delete-configuration', {
        'phpunit.xml': testsuite('a'),
        'a/ATest.php': testCase('ATest'),
        'b/BTest.php': testCase('BTest'),
        '.vscode/settings.json': JSON.stringify({ 'phpunit.phpunit': phpunit }),
    });
    configs.push({
        label: 'watching:delete-configuration',
        files: 'out/tests/suite-watching/deleteConfiguration.test.js',
        mocha: mochaOpts,
        launchArgs: [root, '--disable-extensions', ...userDataDirArgs('delete-configuration')],
    });
}

if (phpUnitStubs.length > 0) {
    const stub = phpUnitStubs.at(-1);
    const phpunit = join(fixturesPath, 'phpunit-stub', stub.binary);
    const root = watchingWorkspace('create-during-continuous-run', {
        'phpunit.xml': testsuite('tests'),
        'tests/ATest.php': testCase('ATest'),
        '.vscode/settings.json': JSON.stringify({ 'phpunit.phpunit': phpunit }),
    });
    configs.push({
        label: 'watching:create-during-continuous-run',
        files: 'out/tests/suite-watching/createDuringContinuousRun.test.js',
        mocha: mochaOpts,
        launchArgs: [
            root,
            '--disable-extensions',
            ...userDataDirArgs('create-during-continuous-run'),
        ],
    });
}

const issue381Root = join(fixturesPath, 'issue-381/php-project');
const issue381Binary = 'vendor/bin/phpunit';
try {
    execSync(`php ${issue381Binary} --version`, { cwd: issue381Root, timeout: 10000 });
    const workspacePath = temporaryWorkspace(
        join(fixturesPath, 'workspaces/issue-381-workspace.code-workspace'),
    );

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
