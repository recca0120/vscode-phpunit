import * as assert from 'assert'
import { Filesystem } from '../src/command'
import { join } from 'path'

suite('Filesystem Tests', () => {
    test('find command', () => {
        const filesystem = new Filesystem()
        if (filesystem.isWindows() === true) {
            assert.equal(
                filesystem.find('code').toLocaleLowerCase(),
                join(__dirname, '../../.vscode-test/code.exe').toLocaleLowerCase()
            )
        } else {
            assert.equal(
                filesystem.find('code').toLocaleLowerCase(),
                join(__dirname, '../../.vscode-test/code').toLocaleLowerCase()
            )
        }
    })

    test('find file', () => {
        const filesystem = new Filesystem()
        assert.equal(filesystem.find(__filename), __filename)
    })
})
