import files from '../src/Filesystem';
import { Process } from '../src/Process';
import { projectPath } from './helpers';

describe('Process', () => {
    it('running phpunit', async () => {
        const phpUnitBinary = await files.findup(
            ['vendor/bin/phpunit', 'phpunit'],
            projectPath('tests').fsPath
        );
        const process = new Process();
        const command = {
            title: 'phpunit',
            command: phpUnitBinary || '',
            arguments: ['--configuration', projectPath('phpunit.xml').fsPath],
        };

        const response = await process.run(command);

        expect(response).toMatch('PHPUnit');
    });

    it('kill', done => {
        const process = new Process();
        const run = function(process: Process, cb: any) {
            process
                .run({
                    title: '',
                    command: 'sleep',
                    arguments: [5],
                })
                .catch(cb);
        };

        const caller = {
            catch: function(error: Error) {
                expect(error).toEqual('killed');
            },
        };
        spyOn(caller, 'catch').and.callThrough();

        expect(process.kill()).toBeFalsy();
        run(process, caller.catch);
        expect(process.kill()).toBeTruthy();
        setTimeout(() => {
            expect(caller.catch).toBeCalledTimes(1);
            done();
        }, 100);
    });
});
