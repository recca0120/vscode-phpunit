import { TestEventCollection } from './../src/TestEventCollection';
import { TestSuiteCollection } from './../src/TestSuiteCollection';
import { Controller } from '../src/Controller';
import { TestRunner } from '../src/TestRunner';
import { projectPath } from './helpers';
import { TestSuiteEvent, TestEvent } from '../src/TestExplorer';

describe('Controller Test', () => {
    const path = projectPath('');

    const connection: any = {
        sendNotification: () => {},
        onNotification: () => {},
        sendRequest: () => {},
        onRequest: () => {},
    };

    const suites = new TestSuiteCollection();
    const events = new TestEventCollection();
    const testRunner = new TestRunner();
    const spawnOptions = { cwd: path.fsPath };
    const controller = new Controller(
        connection,
        suites,
        events,
        testRunner,
    );

    beforeAll(async () => {
        controller.setSpawnOptions(spawnOptions);

        await suites.load(path);
    });

    describe('executeCommand', () => {
        beforeEach(() => {
            spyOn(testRunner, 'run').and.callThrough();
        });

        const getEvents = function(
            events: TestEventCollection,
            filter: (event: TestSuiteEvent | TestEvent) => {}
        ) {
            return events
                .all()
                .slice()
                .filter(event => filter(event));
        };

        const getTestEventId = (event: TestSuiteEvent | TestEvent) => {
            return event.type === 'suite' ? event.suite : event.test;
        };

        const expectedCommand = async (params: any = {}) => {
            await controller.executeCommand(params);

            spyOn(connection, 'sendRequest').and.callFake(
                (requestType: string, params: any) => {
                    if (requestType === 'TestRunStartedEvent') {
                        const runningEvents = getEvents(
                            events,
                            event => event.state === 'running'
                        );

                        expect(params).toEqual({
                            tests: runningEvents.map(event =>
                                getTestEventId(event)
                            ),
                            events: runningEvents,
                        });
                    }

                    if (requestType === 'TestRunFinishedEvent') {
                        expect(params).toEqual({
                            events: events.all(),
                        });
                    }
                }
            );
        };

        it('run all', async () => {
            const params = {
                command: 'phpunit.lsp.run-all',
            };

            await expectedCommand(params);
        });

        it('run file', async () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';

            const params = {
                command: 'phpunit.lsp.run-file',
                arguments: [id],
            };

            await expectedCommand(params);
        });

        it('run test at cursor with id', async () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed';

            const params = {
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [id],
            };

            await expectedCommand(params);

            expect(testRunner.run).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    method: 'test_passed',
                }),
                jasmine.anything()
            );
        });

        it('run test at cursor with cursor', async () => {
            const file = projectPath('tests/AssertionsTest.php').toString();

            const params = {
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [file, 14],
            };

            await expectedCommand(params);

            expect(testRunner.run).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    file: file,
                    method: 'test_passed',
                }),
                jasmine.anything()
            );
        });
    });
});
