import { Container } from './container';
import { StatusBarItem } from 'vscode';

export class StatusBar {
    private statusBarSpinner: any;

    private spinnerIndex = 0;

    private spinner: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    constructor(private statusBarItem: StatusBarItem, private container: Container) {
        this.statusBarItem.command = 'phpunit.TestFile';
    }

    private frame() {
        return this.spinner[(this.spinnerIndex = ++this.spinnerIndex % this.spinner.length)];
    }

    show() {
        this.statusBarItem.show();
    }

    hide() {
        this.statusBarItem.hide();
    }

    initial() {
        this.updateStatus('...');
    }

    running(details?: string) {
        clearInterval(this.statusBarSpinner);
        this.statusBarSpinner = setInterval(() => {
            this.statusBarItem.text = `${this.container.name} ${this.frame()} ${details || ''}`;
        }, 100);
    }

    success(details?: string) {
        this.updateStatus('$(check)', details);
    }

    failed(details?: string) {
        this.updateStatus('$(alert)', details);
    }

    stopped(details?: string) {
        this.updateStatus('stopped', details);
    }

    updateStatus(message: string, details?: string) {
        clearInterval(this.statusBarSpinner);
        this.statusBarItem.text = `${this.container.name} ${message} ${details || ''}`;
    }
}
