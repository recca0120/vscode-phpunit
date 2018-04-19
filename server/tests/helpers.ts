import { resolve } from 'path';
import { Filesystem, FilesystemContract } from '../src/filesystem';

const files: FilesystemContract = new Filesystem();

export function projectPath(p: string) {
    return resolve(__dirname, 'fixtures/project', p.replace(/\\/g, '/')).replace(/^C:/, 'c:');
}

export function projectUri(p: string) {
    return files.uri(projectPath(p));
}

export const pathPattern = /C:\\Users\\recca\\Desktop\\vscode-phpunit\\server\\tests\\fixtures\\project\\(.+\.php)?/g;
