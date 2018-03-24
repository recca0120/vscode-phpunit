import { Filesystem } from './../src/Filesystem';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {isWindows} from './../src/helpers';

describe('Filesystem Test', () => {
    it('it should get content from file', () => {
        const files: Filesystem = new Filesystem();
        const path = resolve(__dirname, 'fixtures/PHPUnitTest.php');

        expect(files.get(path)).toEqual(readFileSync(path).toString('utf8'));
    });

    it('normalize path', () => {
        const files: Filesystem = new Filesystem();
        const path = isWindows() === true ? 'file:///c%3A/foo/bar' : 'file:///usr/bin';
        const result = isWindows() === true ? 'c:\\foo\\bar' : '/usr/bin';

        expect(files.normalizePath(path)).toEqual(result);
    });
});
