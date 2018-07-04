import { StatusBarAlignment, StatusBarItem } from 'vscode';
import { Window } from './wrappers/window';

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

    constructor(private window = new Window(), private spinner: Spinner = new Spinner()) {
        this.statusBarItem = this.window.createStatusBarItem(StatusBarAlignment.Left);
        this.statusBarItem.command = 'show.outputchannel';

        this.initial();
    }

    listen() {
        this.stopped();
        this.statusBarItem.show();
    }

    private initial() {
        this.updateStatus('...');
    }

    public running(details?: string) {
        clearInterval(this.statusBarSpinner);
        this.statusBarSpinner = setInterval(() => {
            this.statusBarItem.text = `${this.statusKey} ${this.spinner.frame()} ${details || ''}`;
        }, 100);
    }

    public passed(details?: string): void {
        this.updateStatus('$(check)', details, '#62b455');
    }

    public failed(details?: string): void {
        this.updateStatus('$(alert)', details, '#ff9b9b');
    }

    public stopped(details?: string): void {
        this.updateStatus('$(stopped)', details, 'inherit');
    }

    public updateStatus(message: string, details?: string, color?: string) {
        clearInterval(this.statusBarSpinner);
        this.statusBarItem.text = `${this.statusKey} ${message} ${details || ''}`;
        this.statusBarItem.color = color;
    }
}
