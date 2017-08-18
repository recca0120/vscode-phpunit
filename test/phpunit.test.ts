import * as assert from 'assert'

import { Parser, State } from '../src/parser'

import { Filesystem } from './../src/filesystem'
import { PHPUnit } from '../src/phpunit'
import { copySync } from 'fs-extra'
import { join } from 'path'

class TestParser extends Parser {
    public async parseXML() {
        const source = join(__dirname, '../../test/fixtures/junit.xml')
        const target = join(__dirname, 'vscode-phpunit-junit.xml')
        copySync(source, target)
        const messages = await super.parseXML(target)

        return messages
    }
}

suite('PHPUnit Tests', () => {
    test('get error messages', async () => {
        const filesystem = new Filesystem()

        const phpunit = new PHPUnit(new TestParser())
        phpunit.setRootPath(__dirname).setTmpDPath(__dirname)

        const messages = await phpunit.handle(join(__dirname, '../../test/fixtures/PHPUnitTest.php'))

        if (filesystem.isWindows() === true) {
            assert.ok(true)

            return
        }

        assert.deepEqual(messages[0], {
            duration: 0.006241,
            filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            lineNumber: 12,
            state: State.PASSED,
            title: 'testPassed',
        })
    })
})
