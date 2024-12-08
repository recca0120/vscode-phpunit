import { readFile } from 'fs/promises';
import { pestProject } from '../__tests__/utils';
import { PestParser } from './PestParser';

describe('PestParser', () => {
    it('abc', async () => {
        const file = pestProject('tests/Unit/ExampleTest.php');
        const buffer = await readFile(file);

        const parser = new PestParser();

        console.log(parser.parse(buffer, file));
    });
});