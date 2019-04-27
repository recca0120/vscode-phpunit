import { Notify } from '../src/notify';

class StubNotify extends Notify {
    public getResult() {
        return this.promise;
    }
}

describe('progress', () => {
    it('show hide', async () => {
        const window: any = {
            withProgress: () => {},
        };
        const progress: any = {};
        const token: any = {};

        spyOn(window, 'withProgress').and.callFake((options, callback) => {
            callback(progress, token);
        });

        const notify = new StubNotify(window);
        notify.show('testing');
        notify.hide();

        const result = await notify.getResult();

        expect(result).toBeUndefined();
    });
});
