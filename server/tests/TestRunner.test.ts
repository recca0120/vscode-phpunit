import _files, { Filesystem } from '../src/filesystem';
import { Process } from '../src/process';
import { TestRunner } from '../src/TestRunner';
import { PHPUnitOutput } from '../src/ProblemMatcher';
import { TestResponse } from '../src/TestResponse';

describe('TestRunner', () => {
    let process: Process;
    let files: Filesystem;
    let testRunner: TestRunner;

    beforeEach(async () => {
        process = new Process();
        files = new Filesystem();
        testRunner = new TestRunner(process, new PHPUnitOutput(), files);
    });

    describe('run', () => {
        let response: TestResponse;

        beforeEach(() => {
            spyOn(process, 'run').and.returnValue('PHPUnit');
        });

        afterEach(() => {
            expect(response.toString()).toEqual('PHPUnit');
        });

        describe('configurtion', () => {
            beforeEach(() => {
                spyOn(files, 'findup').and.returnValues(
                    'phpunit',
                    'phpunit.xml'
                );
            });

            afterEach(() => {
                expect(files.findup).toHaveBeenCalledWith(
                    ['vendor/bin/phpunit', 'phpunit'],
                    undefined
                );
                expect(files.findup).toHaveBeenCalledWith(
                    ['phpunit.xml', 'phpunit.xml.dist'],
                    undefined
                );
            });

            it('run all', async () => {
                response = await testRunner.run();

                expect(process.run).toBeCalledWith(
                    {
                        title: 'PHPUnit LSP',
                        command: 'phpunit',
                        arguments: ['-c', 'phpunit.xml'],
                    },
                    undefined
                );
            });

            it('run file', async () => {
                const params = {
                    file: '/foo.php',
                };

                response = await testRunner.run(params);

                expect(process.run).toHaveBeenCalledWith(
                    {
                        title: 'PHPUnit LSP',
                        command: 'phpunit',
                        arguments: ['-c', 'phpunit.xml', params.file],
                    },
                    undefined
                );
            });

            it('rerun', async () => {
                const params = {
                    file: '/foo.php',
                };

                await testRunner.run(params);
                response = await testRunner.rerun({});

                expect(process.run).toHaveBeenCalledTimes(2);
                expect(process.run).toHaveBeenCalledWith(
                    {
                        title: 'PHPUnit LSP',
                        command: 'phpunit',
                        arguments: ['-c', 'phpunit.xml', params.file],
                    },
                    undefined
                );
            });

            it('run test', async () => {
                const params = {
                    file: '/foo.php',
                    method: 'test_passed',
                    depends: ['test_failed'],
                };

                response = await testRunner.run(params);

                expect(process.run).toHaveBeenCalledWith(
                    {
                        title: 'PHPUnit LSP',
                        command: 'phpunit',
                        arguments: [
                            '-c',
                            'phpunit.xml',
                            '--filter',
                            '^.*::(test_passed|test_failed)( with data set .*)?$',
                            params.file,
                        ],
                    },
                    undefined
                );
            });
        });

        it('custom php, phpunit, args', async () => {
            spyOn(files, 'findup').and.returnValues('phpunit.ini');

            testRunner
                .setPhpBinary('/php')
                .setPhpUnitBinary('/phpunit')
                .setArgs(['foo', 'bar']);

            response = await testRunner.run();

            expect(process.run).toHaveBeenCalledWith(
                {
                    title: 'PHPUnit LSP',
                    command: '/php',
                    arguments: ['/phpunit', '-c', 'phpunit.ini', 'foo', 'bar'],
                },
                undefined
            );
        });
    });

    it('cancel', async () => {
        spyOn(process, 'kill');
        await testRunner.cancel();
        expect(process.kill).toBeCalled();
    });
});
