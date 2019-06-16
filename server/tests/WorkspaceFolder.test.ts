import { ProblemCollection } from './../src/ProblemCollection';
import md5 from 'md5';
import { Configuration } from '../src/Configuration';
import { LogMessageNotification, MessageType } from 'vscode-languageserver';
import { PHPUnitOutput } from './../src/ProblemMatcher';
import { projectPath } from './helpers';
import { TestEventCollection } from '../src/TestEventCollection';
import { TestRunner } from '../src/TestRunner';
import { TestSuiteCollection } from '../src/TestSuiteCollection';
import { WorkspaceFolder } from '../src/WorkspaceFolder';

describe('WorkspaceFolder', () => {
    const folder = {
        uri: projectPath('').toString(),
        name: '',
    };
    const requestName = (name: string) => `${name}-${md5(folder.uri)}`;
    const connection: any = {
        notifications: {},
        requests: {},
        onNotification: (name: string, cb: Function) => {
            connection.notifications[name] = cb;
        },
        triggerNotification: (name: string, params?: any) => {
            return connection.notifications[name](params);
        },
        sendNotification: () => {},
        onRequest: (name: string, cb: Function) => {
            connection.requests[name] = cb;
        },
        triggerRequest: (name: string, params?: any) => {
            return connection.requests[name](params);
        },
        sendRequest: () => {},
        sendDiagnostics: () => {},
    };
    const config = new Configuration(connection, folder);
    const suites = new TestSuiteCollection();
    const events = new TestEventCollection();
    const problems = new ProblemCollection();
    const problemMatcher = new PHPUnitOutput(suites);
    const testRunner = new TestRunner();

    const workspaceFolder = new WorkspaceFolder(
        folder,
        connection,
        config,
        suites,
        events,
        problems,
        problemMatcher,
        testRunner
    );

    it('TestRunStartedEvent Run All', async () => {
        spyOn(workspaceFolder, 'executeCommand');
        await connection.triggerNotification(
            requestName('TestLoadStartedEvent')
        );
        await connection.triggerNotification(
            requestName('TestRunStartedEvent'),
            {
                tests: ['root'],
            }
        );

        expect(workspaceFolder.executeCommand).toHaveBeenCalledWith({
            command: 'phpunit.lsp.run-all',
            arguments: [],
        });
    });

    it('TestRunStartedEvent Run Test At Cursor', async () => {
        spyOn(workspaceFolder, 'executeCommand');
        await connection.triggerNotification(
            requestName('TestLoadStartedEvent')
        );
        await connection.triggerNotification(
            requestName('TestRunStartedEvent'),
            {
                tests: ['foo'],
            }
        );

        expect(workspaceFolder.executeCommand).toHaveBeenCalledWith({
            command: 'phpunit.lsp.run-test-at-cursor',
            arguments: ['foo'],
        });
    });

    describe('execute command', () => {
        beforeAll(async () => {
            await workspaceFolder.loadTest();
        });

        beforeEach(() => {
            spyOn(connection, 'sendNotification');
            spyOn(connection, 'sendRequest');
        });

        afterEach(() => {
            expect(connection.sendRequest).toHaveBeenCalledWith(
                requestName('TestRunStartedEvent'),
                jasmine.anything()
            );
            expect(connection.sendNotification).toHaveBeenCalledWith(
                'TestRunStartedEvent',
                jasmine.anything()
            );
            expect(connection.sendNotification).toHaveBeenCalledWith(
                'TestRunFinishedEvent',
                jasmine.anything()
            );
            expect(connection.sendNotification).toHaveBeenCalledWith(
                LogMessageNotification.type,
                {
                    type: MessageType.Log,
                    message: jasmine.any(String),
                }
            );
        });

        it('run all', async () => {
            await workspaceFolder.executeCommand({
                command: 'phpunit.lsp.run-all',
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                requestName('TestRunFinishedEvent'),
                jasmine.anything()
            );
        });

        it('run file', async () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';

            await workspaceFolder.executeCommand({
                command: 'phpunit.lsp.run-file',
                arguments: [id],
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                requestName('TestRunFinishedEvent'),
                jasmine.anything()
            );
        });

        it('run test at cursor with id', async () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';

            await workspaceFolder.executeCommand({
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [id],
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                requestName('TestRunFinishedEvent'),
                jasmine.anything()
            );
        });

        it('run test at cursor with cursor', async () => {
            const file = projectPath('tests/AssertionsTest.php').toString();

            await workspaceFolder.executeCommand({
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [file, 14],
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                requestName('TestRunFinishedEvent'),
                jasmine.anything()
            );
        });

        it('rerun', async () => {
            const file = projectPath('tests/AssertionsTest.php').toString();

            await workspaceFolder.executeCommand({
                command: 'phpunit.lsp.rerun',
                arguments: [file, 14],
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                requestName('TestRunFinishedEvent'),
                jasmine.anything()
            );
        });
    });
});
