import { Configuration } from './../src/Configuration';
import { Controller } from './../src/Controller';
import { TestSuiteCollection } from '../src/TestSuiteCollection';
import { TestEventCollection } from '../src/TestEventCollection';
import { TestRunner } from '../src/TestRunner';
import { projectPath } from './helpers';
import {
    LogMessageNotification,
    MessageType,
} from 'vscode-languageserver-protocol';

fdescribe('Controller Test', () => {
    const cwd = projectPath('').fsPath;
    const connection: any = {
        onNotification: () => {},
        sendNotification: () => {},
        sendRequest: () => {},
    };
    const configuration = new Configuration(connection);
    const suites = new TestSuiteCollection();
    const events = new TestEventCollection();
    const testRunner = new TestRunner();
    const spawnOptions = {
        cwd,
    };

    let controller: Controller;
    beforeEach(async () => {
        controller = new Controller(
            connection,
            configuration,
            suites,
            events,
            testRunner
        );
        controller.setSpawnOptions(spawnOptions);
        await suites.load('tests/**/*.php', { cwd: spawnOptions.cwd });
    });

    describe('execute command', () => {
        beforeEach(() => {
            spyOn(connection, 'sendNotification');
            spyOn(connection, 'sendRequest');
        });

        afterEach(() => {
            expect(connection.sendNotification).toHaveBeenCalledWith(
                'TestRunStartedEvent',
                jasmine.anything()
            );
            expect(connection.sendRequest).toHaveBeenCalledWith(
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
            await controller.executeCommand({
                command: 'phpunit.lsp.run-all',
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                'TestRunFinishedEvent',
                jasmine.anything()
            );
        });

        it('run file', async () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';

            await controller.executeCommand({
                command: 'phpunit.lsp.run-file',
                arguments: [id],
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                'TestRunFinishedEvent',
                jasmine.anything()
            );
        });

        it('run test at cursor with id', async () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';

            await controller.executeCommand({
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [id],
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                'TestRunFinishedEvent',
                jasmine.anything()
            );
        });

        it('run test at cursor with cursor', async () => {
            const file = projectPath('tests/AssertionsTest.php').toString();

            await controller.executeCommand({
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [file, 14],
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                'TestRunFinishedEvent',
                jasmine.anything()
            );
        });

        it('rerun', async () => {
            const file = projectPath('tests/AssertionsTest.php').toString();

            await controller.executeCommand({
                command: 'phpunit.lsp.rerun',
                arguments: [file, 14],
            });

            expect(connection.sendRequest).toHaveBeenCalledWith(
                'TestRunFinishedEvent',
                jasmine.anything()
            );
        });
    });
});
