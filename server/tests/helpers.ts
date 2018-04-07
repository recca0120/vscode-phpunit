import { resolve } from 'path';

export function projectPath(p: string) {
    return resolve(__dirname, 'fixtures/project', p.replace(/\\/g, '/'));
}

export const pathPattern = /C:\\Users\\recca\\Desktop\\vscode-phpunit\\server\\tests\\fixtures\\project\\(.+\.php)?/g;
