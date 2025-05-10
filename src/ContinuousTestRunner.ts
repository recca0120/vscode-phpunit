import * as vscode from 'vscode';
import { EventEmitter, TestItem, TestRunProfile, TestRunRequest, Uri } from 'vscode';
import { Handler } from './Handler';
import { TestCollection } from './TestCollection';

export class ContinuousTestRunner implements vscode.Disposable {
    private readonly watchingTests = new Map<TestItem | 'ALL', TestRunProfile | undefined>();
    private disposables: vscode.Disposable[] = [];

    constructor(
        private handler: Handler,
        private testCollection: TestCollection,
        private fileChangedEmitter: EventEmitter<Uri> // Receive the emitter from ExtensionManager
    ) {
        this.disposables.push(this.fileChangedEmitter.event(uri => this.onFileChanged(uri)));
    }

    private onFileChanged(uri: vscode.Uri) {
        if (this.watchingTests.has('ALL')) {
            this.handler.startTestRun(new TestRunRequest(undefined, undefined, this.watchingTests.get('ALL'), true));
            return;
        }

        const include: TestItem[] = [];
        let profile: TestRunProfile | undefined;
        for (const [item, thisProfile] of this.watchingTests) {
            const cast = item as TestItem;
            if (cast.uri?.toString() === uri.toString()) {
                include.push(...this.testCollection.findTestsByFile(cast.uri!));
                profile = thisProfile;
            }
        }

        if (include.length) {
            this.handler.startTestRun(new TestRunRequest(include, undefined, profile, true));
        }
    }

    public handleRunRequest(request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) {
        if (!request.continuous) {
            // This runner only handles continuous runs
            return;
        }

        if (request.include === undefined) {
            this.watchingTests.set('ALL', request.profile);
            cancellation.onCancellationRequested(() => this.watchingTests.delete('ALL'));
        } else {
            request.include.forEach(item => this.watchingTests.set(item, request.profile));
            cancellation.onCancellationRequested(() => request.include!.forEach(item => this.watchingTests.delete(item)));
        }
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        // The emitter is owned by ExtensionManager, so we don't dispose it here
    }
}
