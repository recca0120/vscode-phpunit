import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { PHPUnitXML } from '../PHPUnitXML';
import { ChainAstParser } from '../TestParser/ChainAstParser';
import { ClassHierarchy } from '../TestParser/ClassHierarchy';
import { PhpParserAstParser } from '../TestParser/php-parser/PhpParserAstParser';
import { TestParser } from '../TestParser/TestParser';
import { TreeSitterAstParser } from '../TestParser/tree-sitter/TreeSitterAstParser';
import { type TestDefinition, TestType } from '../types';

export const fixturePath = (uri: string) => join(__dirname, 'fixtures', uri);
export const phpUnitProject = (uri: string) => fixturePath(join('phpunit-stub', uri));
export const phpUnitProjectWin = (path: string) =>
    `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');
export const pestProject = (uri: string) => fixturePath(join('pest-stub', uri));
export const normalPath = (path: string) =>
    path.replace(/^\w:/, (matched) => matched.toLowerCase());

export const getPhpUnitVersion = (): string => {
    const stubs = detectPhpUnitStubs();
    if (stubs.length === 0) {
        throw new Error('No PHPUnit stubs found');
    }
    return stubs[0].phpUnitVersion;
};

export const parseTestFile = (buffer: Buffer | string, file: string, root: string) => {
    const phpUnitXML = new PHPUnitXML();
    phpUnitXML.setRoot(root);
    const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
    const testParser = new TestParser(phpUnitXML, astParser);
    const classHierarchy = new ClassHierarchy();

    const result = testParser.parse(buffer, file);
    if (!result) {
        return [];
    }

    for (const cls of result.classes) {
        classHierarchy.register(cls);
    }

    const enriched = classHierarchy.enrichTests(result.tests);
    const tests: TestDefinition[] = [];
    const collect = (defs: TestDefinition[]) => {
        for (const def of defs) {
            tests.push(def);
            if (def.children && def.children.length > 0) {
                collect(def.children);
            }
        }
    };
    collect(enriched);

    return tests;
};

export const findTest = (tests: TestDefinition[], id: string) => {
    const lookup: Record<number, (test: TestDefinition) => boolean> = {
        [TestType.method]: (test) => test.methodName === id,
        [TestType.describe]: (test) => test.methodName === id,
        [TestType.class]: (test) => test.className === id && !test.methodName,
        [TestType.namespace]: (test) => test.classFQN === id && !test.className && !test.methodName,
    };

    for (const fn of Object.values(lookup)) {
        const test = tests.find(fn);
        if (test) {
            return test;
        }
    }

    return undefined;
};

export interface PhpUnitStub {
    name: string;
    root: string;
    phpUnitVersion: string;
    binary: string;
    args: string[];
}

export function detectPhpUnitStubs(): PhpUnitStub[] {
    const versions = [9, 10, 11, 12];
    const root = phpUnitProject('');

    return versions.flatMap((v) => {
        const binary = `v${v}/vendor/bin/phpunit`;
        try {
            const output = execSync(`php ${binary} --version`, {
                cwd: root,
                timeout: 10000,
            }).toString();
            const phpUnitVersion = output.match(/PHPUnit\s([\d.]+)/)?.[1] ?? '';
            return [
                {
                    name: `v${v}`,
                    root,
                    phpUnitVersion,
                    binary,
                    args: ['-c', join(root, `v${v}/phpunit.xml`)],
                },
            ];
        } catch {
            return [];
        }
    });
}

export interface ParatestStub {
    name: string;
    root: string;
    binary: string;
    args: string[];
}

export function detectParatestStubs(): ParatestStub[] {
    const versions = [9, 10, 11, 12];
    const root = phpUnitProject('');

    return versions.flatMap((v) => {
        const binary = `v${v}/vendor/bin/paratest`;
        try {
            execSync(`php ${binary} --version`, {
                cwd: root,
                timeout: 10000,
            });
            return [
                {
                    name: `v${v}`,
                    root,
                    binary,
                    args: ['-c', join(root, `v${v}/phpunit.xml`)],
                },
            ];
        } catch {
            return [];
        }
    });
}

export interface PestStub {
    name: string;
    root: string;
    pestVersion: string;
    binary: string;
    args: string[];
}

export function detectPestStubs(): PestStub[] {
    const versions = [2, 3, 4];
    const root = pestProject('');

    return versions.flatMap((v) => {
        const binary = `v${v}/vendor/bin/pest`;
        try {
            const output = execSync(`php ${binary} --version --test-directory=../tests`, {
                cwd: root,
                timeout: 10000,
            }).toString();
            const pestVersion = output.match(/(\d+\.\d+\.\d+)/)?.[1] ?? '';
            return [
                {
                    name: `v${v}`,
                    root,
                    pestVersion,
                    binary,
                    args: ['-c', join(root, `v${v}/phpunit.xml`), '--test-directory=../tests'],
                },
            ];
        } catch {
            return [];
        }
    });
}

export const generateXML = (text: string) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
>
    ${text.trim()}
</phpunit>`;
};
