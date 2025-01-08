import { execSync } from 'node:child_process';
import { join } from 'node:path';

export const fixturePath = (uri: string) => join(__dirname, 'fixtures', uri);
export const phpUnitProject = (uri: string) => fixturePath(join('phpunit-stub', uri));
export const phpUnitProjectWin = (path: string) => `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');
export const pestProject = (uri: string) => fixturePath(join('pest-stub', uri));
export const normalPath = (path: string) => path.replace(/^\w:/, (matched) => matched.toLowerCase());

export const getPhpUnitVersion = (): string => {
    const output = execSync('php vendor/bin/phpunit --version', { cwd: phpUnitProject('') }).toString();

    return output.match(/PHPUnit\s([\d.]+)/)![1];
};

export const getPhpVersion = (phpBinary = 'php'): string => {
    const output = execSync(`${phpBinary} --version`, { cwd: phpUnitProject('') }).toString();

    return output.match(/PHP\s([\d.]+)/)![1];
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