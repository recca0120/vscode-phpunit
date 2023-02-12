import * as path from 'path';
import {exec} from "child_process";

export const fixturePath = (uri: string) => path.join(__dirname, 'fixtures', uri);
export const projectPath = (uri: string) => fixturePath(path.join('project-stub', uri));
export const normalPath = (path: string) =>
    path.replace(/^\w:/, (matched) => matched.toLowerCase());

export const getPhpUnitVersion = (): Promise<number> => {
    return new Promise((resolve) => {
        exec(
            'vendor/bin/phpunit --version',
            {cwd: projectPath('')},
            (_err, output: string) => {
                const matched = output.match(/PHPUnit\s(\d+)\./);
                resolve(parseInt(matched![1], 10));
            }
        );
    })
}
