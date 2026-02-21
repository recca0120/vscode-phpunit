import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { runTests } from '@vscode/test-electron';

const extensionDevelopmentPath = resolve(__dirname, '../../');
const fixturesPath = resolve(extensionDevelopmentPath, '../phpunit/tests/fixtures');

interface StubInfo {
    name: string;
    type: 'phpunit' | 'pest';
    binary: string;
    args: string[];
    launchArgs: string[];
}

function detectPhpUnitStubs(): StubInfo[] {
    const versions = [9, 10, 11, 12];
    const root = join(fixturesPath, 'phpunit-stub');

    return versions.flatMap((v) => {
        const binary = `v${v}/vendor/bin/phpunit`;
        try {
            execSync(`php ${binary} --version`, { cwd: root, timeout: 10000 });
            return [
                {
                    name: `v${v}`,
                    type: 'phpunit' as const,
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

function detectPestStubs(): StubInfo[] {
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
                    type: 'pest' as const,
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

async function runStubTest(stub: StubInfo, extensionTestsPath: string): Promise<void> {
    console.log(`\n=== Running e2e: ${stub.type} ${stub.name} ===\n`);
    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [...stub.launchArgs, '--disable-extensions'],
        extensionTestsEnv: {
            STUB_TYPE: stub.type,
            STUB_VERSION: stub.name,
            STUB_BINARY: stub.binary,
            STUB_ARGS: JSON.stringify(stub.args),
        },
    });
}

async function runMultiWorkspaceTest(): Promise<void> {
    const phpUnitStubs = detectPhpUnitStubs();
    const pestStubs = detectPestStubs();

    if (phpUnitStubs.length === 0 || pestStubs.length === 0) {
        console.log('Skipping multi-workspace test: need both PHPUnit and Pest stubs');
        return;
    }

    const phpUnit = phpUnitStubs[0];
    const pest = pestStubs[0];
    const workspacePath = join(fixturesPath, 'workspaces/multi-workspace.code-workspace');

    console.log(`\n=== Running e2e: multi-workspace (${phpUnit.name} + ${pest.name}) ===\n`);
    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath: resolve(__dirname, './suite-multi/index'),
        launchArgs: [workspacePath, '--disable-extensions'],
        extensionTestsEnv: {
            PHPUNIT_STUB_VERSION: phpUnit.name,
            PHPUNIT_STUB_BINARY: phpUnit.binary,
            PHPUNIT_STUB_ARGS: JSON.stringify(phpUnit.args),
            PEST_STUB_VERSION: pest.name,
            PEST_STUB_BINARY: pest.binary,
            PEST_STUB_ARGS: JSON.stringify(pest.args),
        },
    });
}

async function main() {
    try {
        const suitePath = resolve(__dirname, './suite/index');
        const phpUnitStubs = detectPhpUnitStubs();
        const pestStubs = detectPestStubs();

        // Run first available PHPUnit stub
        if (phpUnitStubs.length > 0) {
            await runStubTest(phpUnitStubs[0], suitePath);
        }

        // Run first available Pest stub
        if (pestStubs.length > 0) {
            await runStubTest(pestStubs[0], suitePath);
        }

        // Run multi-workspace test
        await runMultiWorkspaceTest();
    } catch (_err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
