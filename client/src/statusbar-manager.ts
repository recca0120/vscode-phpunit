import { window, StatusBarAlignment, StatusBarItem } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';

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

    constructor(private client: LanguageClient, private win = window, private spinner: Spinner = new Spinner()) {
        this.statusBarItem = this.win.createStatusBarItem(StatusBarAlignment.Left);
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
