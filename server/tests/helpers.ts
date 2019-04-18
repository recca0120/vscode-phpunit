import { join } from 'path';

export function fixturePath(...paths: string[]) {
    return join(__dirname, 'fixtures', ...paths);
}

export function projectPath(...paths: string[]) {
    return fixturePath('project-sub', ...paths);
}
