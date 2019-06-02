import { LanguageClient, Command } from 'vscode-languageclient';
import { LanguageClientAdapter } from './../src/LanguageClientAdapter';
import { Log } from 'vscode-test-adapter-util';
import { Uri, WorkspaceFolder } from 'vscode';

describe('LanguageClientAdapterTest', () => {
    const workspaceFolder: WorkspaceFolder = {
        uri: Uri.parse(__dirname),
        name: 'folder',
        index: 1,
    };
    const client = new LanguageClient(
        'phpunit',
        {
            run: { command: '' },
            debug: { command: '' },
        },
        {}
    );

    const log = new Log('phpunit', workspaceFolder, 'PHPUnit TestExplorer');

    let adapter: LanguageClientAdapter;

    beforeEach(() => {
        spyOn(client, 'onReady').and.callFake(() => Promise.resolve(true));
    });

    afterEach(() => {
        expect(client.onReady).toBeCalled();
    });

    describe('TestLoad', () => {
        it('load tests', async () => {
            adapter = new LanguageClientAdapter(workspaceFolder, client, log);
            spyOn(client, 'sendRequest');

            await adapter.load();

            expect(client.sendRequest).toBeCalledWith('TestLoadStartedEvent');
        });

        it('on test load started event', done => {
            adapter = new LanguageClientAdapter(workspaceFolder, client, log);
            const testsEmitter = adapter['testsEmitter'];

            spyOn(client, 'onRequest').and.callFake(
                (name: string, cb: Function) => {
                    if (name === 'TestLoadStartedEvent') {
                        cb();
                    }
                }
            );

            spyOn(testsEmitter, 'fire').and.callFake(({ type }) => {
                expect(type).toEqual('started');
                done();
            });
        });

        it('on test load finished event', done => {
            adapter = new LanguageClientAdapter(workspaceFolder, client, log);
            const testsEmitter = adapter['testsEmitter'];
            const fooSuite = {
                foo: 'bar',
            };
            const started = false;

            spyOn(client, 'onRequest').and.callFake(
                (name: string, cb: Function) => {
                    if (name === 'TestLoadFinishedEvent') {
                        cb({ suite: fooSuite, started });
                    }
                }
            );

            spyOn(testsEmitter, 'fire').and.callFake(({ type, suite }) => {
                if (type === 'started') {
                    expect(type).toEqual('started');
                }

                if (type === 'finished') {
                    expect(type).toEqual('finished');
                    expect(suite).toEqual(fooSuite);
                    done();
                }
            });
        });
    });

    describe('TestRun', () => {
        it('run tests', async () => {
            adapter = new LanguageClientAdapter(workspaceFolder, client, log);
            const tests = ['fooTest.php', 'barTest.php'];
            spyOn(client, 'sendRequest');

            await adapter.run(tests);

            expect(client.sendRequest).toBeCalledWith('TestRunStartedEvent', {
                tests,
            });
        });

        it('on test run started event', done => {
            adapter = new LanguageClientAdapter(workspaceFolder, client, log);
            const testStatesEmitter = adapter['testStatesEmitter'];
            const fooTests = {
                foo: 'tests',
            };
            const fooEvent = {
                type: 'suite',
            };

            spyOn(client, 'onRequest').and.callFake(
                (name: string, cb: Function) => {
                    if (name === 'TestRunStartedEvent') {
                        cb({ tests: fooTests, events: [fooEvent] });
                    }
                }
            );

            spyOn(testStatesEmitter, 'fire').and.callFake((...args: any[]) => {
                if (args[0] === 'started') {
                    expect(args[0]).toEqual('started');
                    expect(args[1]).toEqual(fooTests);
                }

                if (args[0] === fooEvent) {
                    expect(args[0]).toEqual(fooEvent);
                    done();
                }
            });
        });

        it('on test run finished event', done => {
            adapter = new LanguageClientAdapter(workspaceFolder, client, log);
            const testStatesEmitter = adapter['testStatesEmitter'];
            const fooEvent = {
                type: 'test',
            };
            const fooCommand: Command = {
                title: '',
                command: 'foo',
            };

            spyOn(client, 'onRequest').and.callFake(
                (name: string, cb: Function) => {
                    if (name === 'TestRunFinishedEvent') {
                        cb({ events: [fooEvent], command: fooCommand });
                    }
                }
            );

            spyOn(testStatesEmitter, 'fire').and.callFake(({ type }) => {
                if (type === 'test') {
                    expect(type).toEqual('test');
                }

                if (type === 'finished') {
                    expect(type).toEqual('finished');
                    done();
                }
            });
        });
    });

    it('cancel', async () => {
        adapter = new LanguageClientAdapter(workspaceFolder, client, log);
        spyOn(client, 'sendRequest');

        await adapter.cancel();

        expect(client.sendRequest).toBeCalledWith('TestCancelStartedEvent');
    });

    it('dispose', async () => {
        adapter = new LanguageClientAdapter(workspaceFolder, client, log);
        spyOn(client, 'sendRequest');

        await adapter.dispose();

        expect(client.sendRequest).toBeCalledWith('TestCancelStartedEvent');
    });
});
