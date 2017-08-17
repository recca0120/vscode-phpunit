import * as assert from 'assert'
import { PHPUnit } from '../src/phpunit'
import { Parser } from '../src/parser'
import { join } from 'path'
import { copySync } from 'fs-extra'

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
  test('PHPUnit Test', async () => {
    const runner = new PHPUnit(
      {
        rootPath: __dirname,
        tmpdir: __dirname,
      },
      new TestParser()
    )
    const messages = await runner.run(join(__dirname, '../../test/fixtures/PHPUnitTest.php'))

    assert.deepEqual(messages[0], {
      duration: 0.006241,
      filePath: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
      lineNumber: 12,
      state: 'passed',
      title: 'testPassed',
    })
  })
})
