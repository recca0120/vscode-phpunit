import { LanguageClientAdapter } from './../src/LanguageClientAdapter';
import { Log } from 'vscode-test-adapter-util';
import { Uri, WorkspaceFolder } from 'vscode';
import md5 from 'md5';

describe('LanguageClientAdapterTest', () => {
    const workspaceFolder: WorkspaceFolder = {
        uri: Uri.parse(__dirname),
        name: 'folder',
        index: 1,
    };

    const requestName = (name: string) =>
        `${name}-${md5(workspaceFolder.uri.toString())}`;

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
        spyOn(client, 'sendRequest');

        await adapter.load();

        expect(client.sendRequest).toHaveBeenCalledWith(
            requestName('TestLoadStartedEvent')
        );
    });

    it('run', async () => {
        const tests = ['foo', 'bar'];
        spyOn(client, 'sendRequest');

        await adapter.run(tests);

        expect(client.sendRequest).toHaveBeenCalledWith(
            requestName('TestRunStartedEvent'),
            {
                tests,
            }
        );
    });

    it('cancel', async () => {
        spyOn(client, 'sendRequest');

        await adapter.cancel();

        expect(client.sendRequest).toHaveBeenCalledWith(
            requestName('TestCancelEvent')
        );
    });

    it('dispose', async () => {
        spyOn(client, 'sendRequest');

        await adapter.dispose();

        expect(client.sendRequest).toHaveBeenCalledWith(
            requestName('TestCancelEvent')
        );
    });

    it('test load started event', () => {
        const testsEmitter = adapter['testsEmitter'];
        spyOn(testsEmitter, 'fire');

        client.triggerRequest(requestName('TestLoadStartedEvent'));

        expect(testsEmitter.fire).toHaveBeenCalledWith({ type: 'started' });
    });

    it('test load finished event', () => {
        const testsEmitter = adapter['testsEmitter'];
        spyOn(testsEmitter, 'fire');
        const fooSuite = {
            foo: 'bar',
        };

        client.triggerRequest(requestName('TestLoadFinishedEvent'), {
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

        client.triggerRequest(requestName('TestRunStartedEvent'), {
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

        client.triggerRequest(requestName('TestRunFinishedEvent'), {
            events: [fooEvent],
            command: fooCommand,
        });

        expect(testStatesEmitter.fire).toHaveBeenCalledWith(fooEvent);
        expect(testStatesEmitter.fire).toHaveBeenCalledWith({
            type: 'finished',
        });
    });
});
