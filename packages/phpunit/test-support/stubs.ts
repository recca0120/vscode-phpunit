import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { pestProject, phpUnitProject } from './fixtures';

export interface ParatestStub {
    name: string;
    root: string;
    binary: string;
    args: string[];
}

export interface PhpUnitStub extends ParatestStub {
    phpUnitVersion: string;
}

export interface PestStub extends ParatestStub {
    pestVersion: string;
}

const detectInstalled = <T>(
    root: string,
    versions: number[],
    binaryName: string,
    fromVersionOutput: (output: string) => T,
    extraArgs: string[] = [],
): (ParatestStub & T)[] =>
    versions.flatMap((v) => {
        const binary = `v${v}/vendor/bin/${binaryName}`;
        try {
            const output = execSync(['php', binary, '--version', ...extraArgs].join(' '), {
                cwd: root,
                timeout: 10000,
            }).toString();
            return [
                {
                    name: `v${v}`,
                    root,
                    ...fromVersionOutput(output),
                    binary,
                    args: ['-c', join(root, `v${v}/phpunit.xml`), ...extraArgs],
                },
            ];
        } catch {
            return [];
        }
    });

export const detectPhpUnitStubs = (): PhpUnitStub[] =>
    detectInstalled(phpUnitProject(''), [9, 10, 11, 12], 'phpunit', (output) => ({
        phpUnitVersion: output.match(/PHPUnit\s([\d.]+)/)?.[1] ?? '',
    }));

export const detectParatestStubs = (): ParatestStub[] =>
    detectInstalled(phpUnitProject(''), [9, 10, 11, 12], 'paratest', () => ({}));

export const detectPestStubs = (): PestStub[] =>
    detectInstalled(
        pestProject(''),
        [2, 3, 4],
        'pest',
        (output) => ({ pestVersion: output.match(/(\d+\.\d+\.\d+)/)?.[1] ?? '' }),
        ['--test-directory=../tests'],
    );

export const getPhpUnitVersion = (): string => {
    const stubs = detectPhpUnitStubs();
    if (stubs.length === 0) {
        throw new Error('No PHPUnit stubs found');
    }
    return stubs[0].phpUnitVersion;
};
