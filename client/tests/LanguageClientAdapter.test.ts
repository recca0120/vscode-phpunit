import { LanguageClientAdapter } from './../src/LanguageClientAdapter';
import { Log } from 'vscode-test-adapter-util';
import { Uri, WorkspaceFolder } from 'vscode';

describe('LanguageClientAdapterTest', () => {
    const workspaceFolder: WorkspaceFolder = {
        uri: Uri.parse(__dirname),
        name: 'folder',
        index: 1,
    };

    const log = new Log('phpunit', workspaceFolder, 'PHPUnit TestExplorer');

    const client: any = {
        notifications: {},
        requests: {},
        onReady: () => Promise.resolve(true),
        onRequest: (name: string, cb: Function) => {
            client.requests[name] = cb;
        },
        triggerRequest: (name: string, params?: any) => {
            return client.requests[name](params);
        },
        sendRequest: () => {},
        onNotification: (name: string, cb: Function) => {
            client.notifications[name] = cb;
        },
        sendNotification: () => {},
    };

    let adapter: LanguageClientAdapter;

    beforeEach(() => {
        adapter = new LanguageClientAdapter(workspaceFolder, client, log);
    });

    it('load', async () => {
        spyOn(client, 'sendNotification');

        await adapter.load();

        expect(client.sendNotification).toHaveBeenCalledWith(
            adapter.requestName('TestLoadStartedEvent')
        );
    });

    it('run', async () => {
        const tests = ['foo', 'bar'];
        spyOn(client, 'sendNotification');

        await adapter.run(tests);

        expect(client.sendNotification).toHaveBeenCalledWith(
            adapter.requestName('TestRunStartedEvent'),
            {
                tests,
            }
        );
    });

    it('cancel', async () => {
        spyOn(client, 'sendNotification');

        await adapter.cancel();

        expect(client.sendNotification).toHaveBeenCalledWith(
            adapter.requestName('TestCancelEvent')
        );
    });

    it('dispose', async () => {
        spyOn(client, 'sendNotification');

        await adapter.dispose();

        expect(client.sendNotification).toHaveBeenCalledWith(
            adapter.requestName('TestCancelEvent')
        );
    });

    it('test load started event', () => {
        const testsEmitter = adapter['testsEmitter'];
        spyOn(testsEmitter, 'fire');

        client.triggerRequest(adapter.requestName('TestLoadStartedEvent'));

        expect(testsEmitter.fire).toHaveBeenCalledWith({ type: 'started' });
    });

    it('test load finished event', () => {
        const testsEmitter = adapter['testsEmitter'];
        spyOn(testsEmitter, 'fire');
        const fooSuite = {
            foo: 'bar',
        };

        client.triggerRequest(adapter.requestName('TestLoadFinishedEvent'), {
            suite: fooSuite,
        });

        expect(testsEmitter.fire).toHaveBeenCalledWith({
            type: 'finished',
            suite: fooSuite,
        });
    });

    it('test run started event', () => {
        const testStatesEmitter = adapter['testStatesEmitter'];
        spyOn(testStatesEmitter, 'fire');
        const tests = ['foo'];
        const fooEvent = {
            type: 'suite',
            state: 'fail',
        };

        client.triggerRequest(adapter.requestName('TestRunStartedEvent'), {
            tests: tests,
            events: [fooEvent],
        });

        expect(testStatesEmitter.fire).toHaveBeenCalledWith({
            type: 'started',
            tests,
        });

        expect(testStatesEmitter.fire).toHaveBeenCalledWith(fooEvent);
    });

    it('test run finished event', () => {
        const testStatesEmitter = adapter['testStatesEmitter'];
        spyOn(testStatesEmitter, 'fire');
        const fooCommand = {
            title: '',
            command: 'foo',
        };
        const fooEvent = {
            type: 'test',
            state: 'fail',
        };

        client.triggerRequest(adapter.requestName('TestRunFinishedEvent'), {
            events: [fooEvent],
            command: fooCommand,
        });

        expect(testStatesEmitter.fire).toHaveBeenCalledWith(fooEvent);
        expect(testStatesEmitter.fire).toHaveBeenCalledWith({
            type: 'finished',
        });
    });

    it('test retry event', async () => {
        const retireEmitter = adapter['retireEmitter'];
        spyOn(retireEmitter, 'fire');

        client.triggerRequest(adapter.requestName('TestRetryEvent'));

        expect(retireEmitter.fire).toHaveBeenCalled();
    });
});
