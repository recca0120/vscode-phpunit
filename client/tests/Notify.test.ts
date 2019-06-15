import { Notify } from '../src/notify';

class StubNotify extends Notify {
    public getResult() {
        return this.promise;
    }
}

describe('Notify', () => {
    it('show and hide', async () => {
        const window: any = {
            withProgress: () => {},
        };
        const progress: any = {};
        const token: any = {};

        spyOn(window, 'withProgress').and.callFake((...args) => {
            args[1](progress, token);
        });

        const notify = new StubNotify(window);
        notify.show('testing');
        notify.hide();

        const result = await notify.getResult();

        expect(result).toBeUndefined();
    });
});
