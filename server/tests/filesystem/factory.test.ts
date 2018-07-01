import { POSIX, WINDOWS, Factory } from '../../src/filesystem';
import { tap, isWindows } from '../../src/support/helpers';

describe('Filesystem Factory Test', () => {
    it('it should create posix filesystem', () => {
        const factory: Factory = tap(new Factory(), (factory: Factory) => {
            if (isWindows() === true) {
                factory.platform = 'linux';
            }
        });

        expect(factory.create()).toBeInstanceOf(POSIX);
    });

    it('it should create windows filesystem', () => {
        const factory: Factory = tap(new Factory(), (factory: Factory) => {
            if (isWindows() === false) {
                factory.platform = 'win32';
            }
        });

        expect(factory.create()).toBeInstanceOf(WINDOWS);
    });
});
