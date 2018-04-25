import { window as win, StatusBarAlignment, StatusBarItem, TextEditor } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { DecorateManager } from './decorate-manage';
import { when, tap } from './helpers';

class Spinner {
    private frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    constructor(private i: number = 0) {}

    frame() {
        return this.frames[(this.i = ++this.i % this.frames.length)];
    }
}

export class StatusBarManager {
    private statusBarItem: StatusBarItem;
    private statusKey: string = 'PHPUnit';
    private statusBarSpinner: any;

    constructor(
        private client: LanguageClient,
        private decorateManager: DecorateManager,
        private window = win,
        private spinner: Spinner = new Spinner()
    ) {
        this.statusBarItem = tap(
            this.window.createStatusBarItem(StatusBarAlignment.Left),
            (statusBarItem: StatusBarItem) => {
                statusBarItem.command = 'show.outputchannel';
            }
        );
        this.initial();
    }

    listen() {
        this.stopped();
        this.statusBarItem.show();
        this.client.onNotification('running', this.onRunning.bind(this));
        this.client.onNotification('done', this.onDone.bind(this));
    }

    private onRunning(): void {
        this.client.outputChannel.clear();
        when(this.window.activeTextEditor, (editor: TextEditor) => {
            this.decorateManager.clearDecoratedGutter(editor);
        });

        this.running();
    }

    private onDone(state: any): void {
        if (state.failed > 0) {
            this.failed();
        } else if (state.warning > 0) {
            this.failed();
        } else if (state.passed > 0) {
            this.success();
        } else {
            this.stopped();
        }
    }

    private initial() {
        this.updateStatus('...');
    }

    private running(details?: string) {
        clearInterval(this.statusBarSpinner);
        this.statusBarSpinner = setInterval(() => {
            this.statusBarItem.text = `${this.statusKey} ${this.spinner.frame()} ${details || ''}`;
        }, 100);
    }

    private success(details?: string): void {
        this.updateStatus('$(check)', details);
    }

    private failed(details?: string): void {
        this.updateStatus('$(alert)', details);
    }

    private stopped(details?: string): void {
        this.updateStatus('$(stopped)', details);
    }

    private updateStatus(message: string, details?: string) {
        clearInterval(this.statusBarSpinner);
        this.statusBarItem.text = `${this.statusKey} ${message} ${details || ''}`;
    }
}
