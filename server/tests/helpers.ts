import files from '../src/Filesystem';
import { join } from 'path';

export function fixturePath(...paths: string[]) {
    return files.asUri(join(__dirname, 'fixtures', ...paths));
}

export function projectPath(...paths: string[]) {
    return files.asUri(fixturePath('project-sub', ...paths).fsPath);
}
