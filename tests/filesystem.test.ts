import { Filesystem } from '../src/filesystem'
import { join } from 'path'

describe('Filesystem Tests', () => {
    it('find command', () => {
        const filesystem = new Filesystem()
        if (filesystem.isWindows() === true) {
            expect(filesystem.find('code').toLocaleLowerCase()).toEqual(
                'c:\\program files\\microsoft vs code\\bin\\code.cmd'
            )
        } else {
            expect(filesystem.find('ls').toLocaleLowerCase()).toEqual('/bin/ls')
        }
    })

    it('find file', () => {
        const filesystem = new Filesystem()

        expect(filesystem.find('tests/filesystem.test.ts')).toEqual(join(__dirname, '../tests/filesystem.test.ts'))
    })
})
