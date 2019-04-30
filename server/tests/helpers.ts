import { join } from 'path';
import URI from 'vscode-uri';

export function fixturePath(...paths: string[]) {
    return URI.parse(join(__dirname, 'fixtures', ...paths));
}

export function projectPath(...paths: string[]) {
    return URI.parse(fixturePath('project-sub', ...paths).fsPath);
}
