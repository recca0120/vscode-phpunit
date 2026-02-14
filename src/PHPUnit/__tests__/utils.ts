import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { PHPUnitXML } from '../PHPUnitXML';
import { type TestDefinition, TestType } from '../types';
import { TestParser } from '../TestParser/TestParser';

export const fixturePath = (uri: string) => join(__dirname, 'fixtures', uri);
export const phpUnitProject = (uri: string) => fixturePath(join('phpunit-stub', uri));
export const phpUnitProjectWin = (path: string) =>
    `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');
export const pestProject = (uri: string) => fixturePath(join('pest-stub', uri));
export const normalPath = (path: string) =>
    path.replace(/^\w:/, (matched) => matched.toLowerCase());

export const getPhpUnitVersion = (): string => {
    const output = execSync('php vendor/bin/phpunit --version', {
        cwd: phpUnitProject(''),
    }).toString();

    return output.match(/PHPUnit\s([\d.]+)/)![1];
};

export const getPhpVersion = (phpBinary = 'php'): string => {
    const output = execSync(`${phpBinary} --version`, { cwd: phpUnitProject('') }).toString();

    return output.match(/PHP\s([\d.]+)/)![1];
};

export const parseTestFile = (buffer: Buffer | string, file: string, root: string) => {
    const tests: TestDefinition[] = [];
    const phpUnitXML = new PHPUnitXML();
    phpUnitXML.setRoot(root);
    const testParser = new TestParser(phpUnitXML);
    for (const type of Object.values(TestType).filter((v) => typeof v === 'number') as TestType[]) {
        testParser.on(type, (testDefinition: TestDefinition) => tests.push(testDefinition));
    }
    testParser.parse(buffer, file);

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
