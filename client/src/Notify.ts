import { Progress, ProgressLocation, window } from 'vscode';

interface ProgressOptions {
    message?: string;
    increment?: number;
}

export class Notify {
    private progress: Progress<ProgressOptions> | null = null;
    protected promise: Promise<undefined> | null = null;
    private resolve: Function | null = null;
    // private token?: CancellationToken;

    constructor(private _window = window) {}

    show(title: string, cancellable = false) {
        this._window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: title,
                cancellable: cancellable,
            },
            // (progress: Progress<ProgressOptions>, token: CancellationToken) => {
            (progress: Progress<ProgressOptions>) => {
                this.progress = progress;
                // this.token = token;

                return (this.promise = new Promise(
                    (resolve: Function) => (this.resolve = resolve)
                ));
            }
        );
    }

    report(options: ProgressOptions) {
        this.progress!.report(options);

        return this;
    }

    hide() {
        if (this.resolve) {
            this.resolve();
        }

        this.progress = null;
        this.resolve = null;
    }
}
