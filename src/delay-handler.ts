export class DelayHandler {
    private id: number = 0;

    private rejectFn: Function = null;

    resolve(callback: Function, timeout = 200): Promise<any> {
        this.cancel();

        return new Promise((resolve, reject) => {
            this.bindReject(reject);
            setTimeout(() => {
                (function(id) {
                    resolve(id);
                })(this.id);
            }, timeout);
        }).then((id: number) => {
            if (this.id !== id) {
                return Promise.resolve([]);
            }

            return callback();
        });
    }

    cancel(message = 'cancelled') {
        this.id = this.id > 100 ? 0 : this.id + 1;

        if (this.cancelled() === false) {
            this.rejectFn(message);
            this.reset();
        }
    }

    private cancelled(): boolean {
        return this.rejectFn === null;
    }

    private reset() {
        this.bindReject(null);
    }

    private bindReject(rejectFn: Function) {
        this.rejectFn = rejectFn;
    }
}
