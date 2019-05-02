import { join } from 'path';
import URI from 'vscode-uri';
import files from '../src/Filesystem';

export function fixturePath(...paths: string[]) {
    return files.asUri(join(__dirname, 'fixtures', ...paths));
}

export function projectPath(...paths: string[]) {
    return files.asUri(fixturePath('project-sub', ...paths).fsPath);
}
