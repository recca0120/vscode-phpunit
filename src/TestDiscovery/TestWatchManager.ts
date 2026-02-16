import { inject, injectable } from 'inversify';
import {
    type CancellationToken,
    type EventEmitter,
    type TestItem,
    type TestRunProfile,
    TestRunRequest,
    type Uri,
    window,
} from 'vscode';
import { TestCollection } from '../TestCollection';
import { TestRunHandler } from '../TestExecution';
import { TYPES } from '../types';

@injectable()
export class TestWatchManager {
    private watchAllProfile: TestRunProfile | undefined;
    private isWatchingAll = false;
    private watchingTests = new Map<TestItem, TestRunProfile | undefined>();
    private pendingRun = Promise.resolve();

    constructor(
        @inject(TestRunHandler) private handler: TestRunHandler,
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TYPES.FileChangedEmitter) private fileChangedEmitter: EventEmitter<Uri>,
    ) {}

    handleContinuousRun(request: TestRunRequest, cancellation: CancellationToken): void {
        if (request.include === undefined) {
            this.isWatchingAll = true;
            this.watchAllProfile = request.profile;
            cancellation.onCancellationRequested(() => {
                this.isWatchingAll = false;
                this.watchAllProfile = undefined;
            });
        } else {
            request.include.forEach((testItem) =>
                this.watchingTests.set(testItem, request.profile),
            );
            cancellation.onCancellationRequested(() =>
                request.include?.forEach((testItem) => this.watchingTests.delete(testItem)),
            );
        }
    }

    setupFileChangeListener(): void {
        this.fileChangedEmitter.event((uri) => {
            const request = this.buildRequest(uri);
            if (!request) {
                return;
            }

            this.pendingRun = this.pendingRun
                .then(() => this.handler.startTestRun(request))
                .catch((err) => {
                    const message = err instanceof Error ? err.message : String(err);
                    window.showErrorMessage(`PHPUnit: Failed to run continuous tests: ${message}`);
                });
        });
    }

    private buildRequest(uri: Uri): TestRunRequest | undefined {
        if (this.isWatchingAll) {
            return new TestRunRequest(undefined, undefined, this.watchAllProfile, true);
        }

        const include: TestItem[] = [];
        let profile: TestRunProfile | undefined;
        for (const [testItem, thisProfile] of this.watchingTests) {
            if (testItem.uri?.toString() === uri.toString()) {
                include.push(...this.testCollection.findTestsByFile(testItem.uri));
                profile = thisProfile;
            }
        }

        return include.length
            ? new TestRunRequest(include, undefined, profile, true)
            : undefined;
    }
}
