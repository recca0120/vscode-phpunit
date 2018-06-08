import { POSIX, WINDOWS, Factory } from '../../src/filesystem';
import { tap } from '../../src/helpers';

describe('Filesystem Factory Test', () => {
    it('it should create posix filesystem', () => {
        const factory: Factory = tap(new Factory(), (factory: Factory) => {
            if (factory.isWin() === true) {
                factory.platform = 'linux';
            }
        });

        expect(factory.create()).toBeInstanceOf(POSIX);
    });

    it('it should create windows filesystem', () => {
        const factory: Factory = tap(new Factory(), (factory: Factory) => {
            if (factory.isWin() === true) {
                factory.platform = 'win32';
            }
        });

        expect(factory.create()).toBeInstanceOf(WINDOWS);
    });
});
