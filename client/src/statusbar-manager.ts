import { Test, Type } from './phpunit/common';
import { window, StatusBarAlignment, StatusBarItem } from 'vscode';
import { LanguageClient, Command } from 'vscode-languageclient';

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

    constructor(private client: LanguageClient, private spinner: Spinner = new Spinner(), private win = window) {
        this.statusBarItem = this.win.createStatusBarItem(StatusBarAlignment.Left);
        this.initial();
    }

    listen() {
        this.stopped();
        this.statusBarItem.show();
        this.client.onNotification('running', this.onRunning.bind(this));
        this.client.onNotification('done', this.onDone.bind(this));
    }

    private onRunning(command: Command): void {
        this.client.outputChannel.clear();
        this.client.outputChannel.appendLine([command.command].concat(command.arguments || []).join(' '));
        this.running();
    }

    private onDone(suites: any): void {
        let failed: number = 0;
        let warning: number = 0;
        let passed: number = 0;

        for (const uri in suites) {
            suites[uri].forEach((test: Test) => {
                if ([Type.ERROR, Type.FAILURE, Type.FAILED].indexOf(test.type) !== -1) {
                    failed++;
                } else if ([Type.INCOMPLETE, Type.RISKY, Type.SKIPPED].indexOf(test.type) !== -1) {
                    warning++;
                } else {
                    passed++;
                }
            });
        }

        if (failed > 0) {
            this.failed();
        } else if (warning > 0) {
            this.failed();
        } else if (passed > 0) {
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
