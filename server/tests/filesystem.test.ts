import { join } from 'path';
import { readFileSync, unlinkSync } from 'fs';
import { Filesystem } from '../src/filesystem';

describe('filesystem tests', () => {
    const files = Filesystem.instance();

    it('get content from file', async () => {
        const uri = join(
            __dirname,
            'fixtures/project-sub/tests/AssertionsTest.php'
        );

        const contents = await files.get(uri);

        expect(contents).toContain(readFileSync(uri).toString());
    });

    it('put content to file', async () => {
        const uri = join(__dirname, 'fixtures/write-file.txt');

        expect(await files.put(uri, 'write file')).toBeTruthy();
        unlinkSync(uri);
    });
});
