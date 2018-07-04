import { Textline } from '../../src/support/textline';
import { Filesystem, WINDOWS } from '../../src/filesystem';

describe('Textline Test', () => {
    it('it should get line range', async () => {
        const files: Filesystem = new WINDOWS();
        const textline: Textline = new Textline(files);

        spyOn(files, 'get').and.returnValue(`
<?php

class Foo
{
    public function bar() {
        return true;
    }
}
        `);

        expect(await textline.line('foo', 3)).toEqual({
            end: {
                character: 9,
                line: 3,
            },
            start: {
                character: 0,
                line: 3,
            },
        });
    });
});
