import { CachableFilesystem } from '../src/filesystem';
import { isWindows } from '../src/helpers';
import { resolve as pathResolve } from 'path';

describe('Filesystem Tests', () => {
    it('find command', () => {
        const files = new CachableFilesystem();
        if (isWindows() === true) {
            expect(files.find('cmd').toLowerCase()).toEqual('C:\\Windows\\System32\\cmd.exe'.toLowerCase());
        } else {
            expect(files.find('ls').toLowerCase()).toEqual('/bin/ls');
        }
    });

    it('find file', () => {
        const files = new CachableFilesystem();

        expect(files.find(pathResolve('tests', 'filesystem.test.ts'))).toEqual(
            pathResolve(__dirname, '../tests/filesystem.test.ts')
        );
    });

    it('find up', () => {
        const files = new CachableFilesystem();
        expect(files.findUp('filesystem.test.ts', pathResolve(__dirname, 'fixtures'), __filename)).toEqual(__filename);
    });
});
