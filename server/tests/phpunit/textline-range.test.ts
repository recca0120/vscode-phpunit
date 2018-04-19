import { Filesystem, FilesystemContract } from '../../../server/src/filesystem';
import { os, OS } from '../../src/helpers';
import { Parameters, PhpUnit } from '../../src/phpunit';
import { Process } from '../../src/process';
import { projectPath } from '../helpers';
import { resolve } from 'path';
import { TextlineRange } from './../../src/phpunit';

describe('Textline Range Test', () => {
    it('it should find method from line number', async () => {
        const textlineRange: TextlineRange = new TextlineRange();
        const files: FilesystemContract = new Filesystem();
        const method: string = await textlineRange.findMethod(files.uri(projectPath('tests/AssertionsTest.php')), 50);

        expect(method).toEqual('test_no_assertion');
    });
});
