import {
    CancellationToken, EventEmitter, TestItem, TestRunProfile, TestRunRequest, Uri,
} from 'vscode';
import { TestRunHandler } from './TestRunHandler';
import { TestCollection } from './TestCollection';

export class TestWatchManager {
    private watchingTests = new Map<TestItem | 'ALL', TestRunProfile | undefined>();

    constructor(
        private handler: TestRunHandler,
        private testCollection: TestCollection,
        private fileChangedEmitter: EventEmitter<Uri>,
    ) {}

    createRunHandler(): (request: TestRunRequest, cancellation: CancellationToken) => Promise<void> {
        return async (request: TestRunRequest, cancellation: CancellationToken) => {
            if (!request.continuous) {
                return this.handler.startTestRun(request, cancellation);
            }

            if (request.include === undefined) {
                this.watchingTests.set('ALL', request.profile);
                cancellation.onCancellationRequested(() => this.watchingTests.delete('ALL'));
            } else {
                request.include.forEach((testItem) =>
                    this.watchingTests.set(testItem, request.profile),
                );
                cancellation.onCancellationRequested(() =>
                    request.include!.forEach((testItem) => this.watchingTests.delete(testItem)),
                );
            }
        };
    }

    setupFileChangeListener(): void {
        this.fileChangedEmitter.event((uri) => {
            if (this.watchingTests.has('ALL')) {
                this.handler.startTestRun(
                    new TestRunRequest(
                        undefined,
                        undefined,
                        this.watchingTests.get('ALL'),
                        true,
                    ),
                );
                return;
            }

            const include: TestItem[] = [];
            let profile: TestRunProfile | undefined;
            for (const [testItem, thisProfile] of this.watchingTests) {
                const cast = testItem as TestItem;
                if (cast.uri?.toString() === uri.toString()) {
                    include.push(...this.testCollection.findTestsByFile(cast.uri!));
                    profile = thisProfile;
                }
            }

            if (include.length) {
                this.handler.startTestRun(new TestRunRequest(include, undefined, profile, true));
            }
        });
    }
}
