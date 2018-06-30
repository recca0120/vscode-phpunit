import { TestRunner } from '../src/test-runner';
import { projectPath } from './helpers';
import { isWindows } from '../src/helpers';
import { Process } from '../src/process';
import { Argument } from '../src/argument';

describe('TestRunner Test', () => {
    it('it should execute phpunit', async () => {
        const process: Process = new Process();
        const args: Argument = new Argument();
        const testRunner: TestRunner = new TestRunner(process, args);
        const path: string = projectPath('tests');

        spyOn(args, 'all').and.returnValue(['--foo']);
        spyOn(process, 'spawn').and.returnValue('output');

        expect(new String(await testRunner.handle(path, [], projectPath('tests')))).toEqual('output');
        expect(process.spawn).toBeCalledWith({
            title: '',
            command: `${projectPath('vendor/bin/phpunit')}${isWindows() ? '.bat' : ''}`,
            arguments: ['--foo'],
        });
    });

    it('it should execute with custom phpunit and default arguments', async () => {
        const process: Process = new Process();
        const args: Argument = new Argument();
        const testRunner: TestRunner = new TestRunner(process, args);

        testRunner.setBinary('foo');
        testRunner.setDefaults(['--bar']);

        spyOn(args, 'all').and.returnValue(['--foo']);
        spyOn(process, 'spawn').and.returnValue('output');

        expect(new String(await testRunner.handle('', [], projectPath('tests')))).toEqual('output');
        expect(process.spawn).toBeCalledWith({
            title: '',
            command: 'foo',
            arguments: ['--foo'],
        });
    });
});
