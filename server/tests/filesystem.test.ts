import { join } from 'path';
import { readFileSync } from 'fs';
import { Filesystem } from '../src/filesystem';

describe('filesystem tests', () => {
    it('get content from file', async () => {
        const files = new Filesystem();
        const uri = join(
            __dirname,
            'fixtures/project-sub/tests/AssertionsTest.php'
        );

        const contents = await files.get(uri);

        expect(contents).toContain(readFileSync(uri).toString());
    });
});
