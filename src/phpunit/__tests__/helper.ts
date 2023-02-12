import * as path from 'path';
import {execSync} from "child_process";

export const fixturePath = (uri: string) => path.join(__dirname, 'fixtures', uri);
export const projectPath = (uri: string) => fixturePath(path.join('project-stub', uri));
export const normalPath = (path: string) =>
    path.replace(/^\w:/, (matched) => matched.toLowerCase());

export const getPhpUnitVersion = (): number => {
    const output = execSync('vendor/bin/phpunit --version', {
        cwd: projectPath('')
    }).toString();

    const matched = output.match(/PHPUnit\s(\d+)\./);
    return parseInt(matched![1], 10);
}
