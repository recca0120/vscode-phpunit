import * as vscode from 'vscode';
import { TestController, TestAdapter } from 'vscode-test-adapter-api';

/**
 * This class is intended as a starting point for implementing a "real" TestController.
 * The file `README.md` contains further instructions.
 */
export class PHPUnitController implements TestController {
    // here we collect subscriptions and other disposables that need
    // to be disposed when an adapter is unregistered
    private readonly disposables = new Map<
        TestAdapter,
        { dispose(): void }[]
    >();

    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left
        );
        this.statusBarItem.show();

        // run all tests when the statusBarItem is clicked,
        // we do this by invoking a command that is contributed by the Test Explorer extension
        this.statusBarItem.command = 'test-explorer.run-all';
    }

    registerTestAdapter(adapter: TestAdapter): void {
        const adapterDisposables: { dispose(): void }[] = [];
        this.disposables.set(adapter, adapterDisposables);

        // the ExampleController will simply listen for events from the Test Adapter(s)
        // and write them to a StatusBarItem

        adapterDisposables.push(adapter.tests(() => {}));
        adapterDisposables.push(adapter.testStates(() => {}));
    }

    unregisterTestAdapter(adapter: TestAdapter): void {
        const adapterDisposables = this.disposables.get(adapter);
        if (adapterDisposables) {
            for (const disposable of adapterDisposables) {
                disposable.dispose();
            }

            this.disposables.delete(adapter);
        }
    }
}
