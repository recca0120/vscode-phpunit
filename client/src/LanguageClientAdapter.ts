import md5 from 'md5';
import { Event, EventEmitter, WorkspaceFolder } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { Log } from 'vscode-test-adapter-util';
import {
    TestAdapter,
    TestLoadStartedEvent,
    TestLoadFinishedEvent,
    TestRunStartedEvent,
    TestRunFinishedEvent,
    TestSuiteEvent,
    TestEvent,
    RetireEvent,
} from 'vscode-test-adapter-api';

export class LanguageClientAdapter implements TestAdapter {
    private disposables: { dispose(): void }[] = [];

    private readonly testsEmitter = new EventEmitter<
        TestLoadStartedEvent | TestLoadFinishedEvent
    >();

    private readonly testStatesEmitter = new EventEmitter<
        TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
    >();

    private readonly retireEmitter = new EventEmitter<RetireEvent>();

    get tests(): Event<TestLoadStartedEvent | TestLoadFinishedEvent> {
        return this.testsEmitter.event;
    }

    get testStates(): Event<
        TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
    > {
        return this.testStatesEmitter.event;
    }

    get retire(): Event<RetireEvent> {
        return this.retireEmitter.event;
    }

    constructor(
        public workspaceFolder: WorkspaceFolder,
        private client: LanguageClient,
        private log: Log
    ) {
        this.onTestLoadStartedEvent();
        this.onTestLoadFinishedEvent();
        this.onTestRunStartedEvent();
        this.onTestRunFinishedEvent();

        this.disposables.push(this.testsEmitter);
        this.disposables.push(this.testStatesEmitter);
        this.disposables.push(this.retireEmitter);
    }

    async load(): Promise<void> {
        await this.client.onReady();

        await this.client.sendRequest(this.requestName('TestLoadStartedEvent'));
    }

    async run(tests: string[]): Promise<void> {
        await this.client.onReady();

        await this.client.sendRequest(this.requestName('TestRunStartedEvent'), {
            tests,
        });
    }

    // debug?(tests: string[]): Promise<void> {
    //     console.log(tests);
    //     throw new Error('Method not implemented.');
    // }

    async cancel() {
        await this.client.onReady();

        this.client.sendRequest(this.requestName('TestCancelEvent'));
    }

    async dispose(): Promise<void> {
        await this.cancel();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    private async onTestLoadStartedEvent(): Promise<void> {
        await this.client.onReady();

        this.log.info('started');
        this.client.onRequest(this.requestName('TestLoadStartedEvent'), () =>
            this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' })
        );
    }

    private async onTestLoadFinishedEvent() {
        await this.client.onReady();

        this.client.onRequest(
            this.requestName('TestLoadFinishedEvent'),
            ({ suite }) => {
                this.testsEmitter.fire(<TestLoadFinishedEvent>{
                    type: 'finished',
                    suite: suite,
                });
            }
        );
    }

    private async onTestRunStartedEvent() {
        await this.client.onReady();

        this.client.onRequest(
            this.requestName('TestRunStartedEvent'),
            ({ tests, events }) => {
                this.testStatesEmitter.fire(<TestRunStartedEvent>{
                    type: 'started',
                    tests,
                });

                this.updateEvents(events);
            }
        );
    }

    private async onTestRunFinishedEvent() {
        await this.client.onReady();

        this.client.onRequest(
            this.requestName('TestRunFinishedEvent'),
            ({ events }) => {
                this.updateEvents(events);

                this.testStatesEmitter.fire(<TestRunFinishedEvent>{
                    type: 'finished',
                });
            }
        );
    }

    private updateEvents(events: (TestSuiteEvent | TestEvent)[]): void {
        events.forEach(event => {
            event.type === 'suite'
                ? this.testStatesEmitter.fire(<TestSuiteEvent>event)
                : this.testStatesEmitter.fire(<TestEvent>event);
        });
    }

    private requestName(name: string) {
        return `${name}-${md5(this.workspaceFolder.uri.toString())}`;
    }
}
