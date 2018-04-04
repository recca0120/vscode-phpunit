export enum OS {
    WINDOWS = 1,
    WIN = 1,
    POSIX = 2,
    LINUX = 2,
}

export function os(): OS {
    return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(process.platform) ? OS.WIN : OS.POSIX;
}

export function tap<T>(value: T, callback: Function): T {
    callback(value);

    return value;
}

export function value<T>(value: T, callback: Function): T {
    return callback(value);
}
