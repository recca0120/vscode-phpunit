import { Phpunit, Process } from '../src/phpunit'

import { Filesystem } from './../src/filesystem'
import { Parser } from '../src/parser'
import { Project } from '../src/tester'
import { join } from 'path'

describe('PHPUnit Tests', () => {
    it('get error messages', async () => {
        const project: Project = {}
        const parser = new Parser()
        const filesystem = new Filesystem()
        const process = new Process()
        const fileName = 'fakeFileName'
        spyOn(filesystem, 'exists').and.returnValue(true)
        const command = 'phpunit'
        spyOn(filesystem, 'find').and.returnValue(command)

        spyOn(process, 'spawn').and.callFake(async () => {
            const messages = await process.exitCallback()

            return messages
        })

        const expected = [
            {
                foo: 'bar',
            },
        ]
        spyOn(parser, 'parseXML').and.returnValue(expected)

        const phpunit = new Phpunit(project, parser, filesystem, process)
        const messages = await phpunit.exec(fileName, 'class Test extends TestCase')
        expect(messages).toBe(expected)

        expect(filesystem.exists).toHaveBeenCalledWith(join(__dirname, '/../src/vendor/bin/phpunit'))
        expect(filesystem.find).toHaveBeenCalledWith(join(__dirname, '/../src/vendor/bin/phpunit'))
    })
})
