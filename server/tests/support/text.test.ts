import { Text } from '../../src/support/text';
import { Filesystem, Factory as FilesystemFactory } from '../../src/filesystem';

describe('Text Test', () => {
    it('it should get line range', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const text: Text = new Text(files);

        spyOn(files, 'get').and.returnValue(`
<?php

class Foo
{
    public function bar() {
        return true;
    }
}
        `);

        expect(await text.line('foo', 3)).toEqual({
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
