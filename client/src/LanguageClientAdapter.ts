import { Event, EventEmitter, WorkspaceFolder } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
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
        private client: LanguageClient
    ) {
        this.listenTestLoadFinishedEvent();
        this.listenTestRunStartedEvent();
        this.listenTestRunFinishedEvent();

        this.disposables.push(this.testsEmitter);
        this.disposables.push(this.testStatesEmitter);
        this.disposables.push(this.retireEmitter);
    }

    async load(): Promise<void> {
        this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });

        await this.sendRequest('TestLoadStartedEvent');
    }

    async run(tests: string[]): Promise<void> {
        await this.sendRequest('TestRunStartedEvent', { tests });
    }

    // debug?(tests: string[]): Promise<void> {
    //     console.log(tests);
    //     throw new Error('Method not implemented.');
    // }

    cancel(): void {
        throw new Error('Method not implemented.');
    }

    dispose(): void {
        // this.cancel();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    private listenTestLoadFinishedEvent() {
        this.onRequest(
            'TestLoadFinishedEvent',
            ({ suite }): any => {
                this.testsEmitter.fire(<TestLoadFinishedEvent>{
                    type: 'finished',
                    suite: suite,
                });
            }
        );
    }

    private listenTestRunStartedEvent() {
        this.onRequest(
            'TestRunStartedEvent',
            ({ tests, events }): any => {
                this.testStatesEmitter.fire(<TestRunStartedEvent>{
                    type: 'started',
                    tests,
                });

                this.updateEvents(events);
            }
        );
    }

    private listenTestRunFinishedEvent() {
        this.onRequest(
            'TestRunFinishedEvent',
            ({ events }): any => {
                this.updateEvents(events);
                this.testStatesEmitter.fire(<TestRunFinishedEvent>{
                    type: 'finished',
                });
            }
        );
    }

    private async sendRequest(
        requestType: string,
        params: any = {}
    ): Promise<any> {
        await this.client.onReady();

        return await this.client.sendRequest(requestType, params);
    }

    private async onRequest(
        requestType: string,
        cb: (params?: any) => {}
    ): Promise<any> {
        await this.client.onReady();

        return this.client.onRequest(requestType, cb);
    }

    private updateEvents(events: (TestSuiteEvent | TestEvent)[]) {
        events.forEach((event: TestSuiteEvent | TestEvent) => {
            event.type === 'suite'
                ? this.testStatesEmitter.fire(<TestSuiteEvent>event)
                : this.testStatesEmitter.fire(<TestEvent>event);
        });
    }
}
