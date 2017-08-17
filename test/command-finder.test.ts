import * as assert from 'assert'
import { CommandFinder } from '../src/command-finder'
import { join } from 'path'

suite('Finder Tests', () => {
    test('find command', () => {
        const finder = new CommandFinder()
        if (finder.isWindows() === true) {
            assert.equal(
                finder.find('code').toLocaleLowerCase(),
                join(__dirname, '../../.vscode-test/code.exe').toLocaleLowerCase()
            )
        } else {
            assert.equal(
                finder.find('code').toLocaleLowerCase(),
                join(__dirname, '../../.vscode-test/code').toLocaleLowerCase()
            )
        }
    })

    test('find file', () => {
        const finder = new CommandFinder()
        assert.equal(finder.find(__filename), __filename)
    })
})
