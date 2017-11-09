import { Filesystem } from '../src/filesystem';
import { join } from 'path';

describe('Filesystem Tests', () => {
    it('find command', () => {
        const filesystem = new Filesystem();
        if (filesystem.isWindows() === true) {
            expect(filesystem.find('cmd').toLowerCase()).toEqual('C:\\Windows\\System32\\cmd.exe'.toLowerCase());
        } else {
            expect(filesystem.find('ls').toLowerCase()).toEqual('/bin/ls');
        }
    });

    it('find file', () => {
        const filesystem = new Filesystem();

        expect(filesystem.find(join('tests', 'filesystem.test.ts'))).toEqual(
            join(__dirname, '../tests/filesystem.test.ts')
        );
    });
});
