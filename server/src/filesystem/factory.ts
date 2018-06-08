import { Filesystem, POSIX, WINDOWS } from './';

export class Factory {
    public platform: string = process.platform;

    create(): Filesystem {
        return this.isWin() ? new WINDOWS() : new POSIX();
    }

    isWin(): boolean {
        return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(this.platform) ? true : false;
    }
}
