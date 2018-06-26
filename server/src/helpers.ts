export function tap<T>(obj: T, callback: Function): T {
    callback(obj);

    return obj;
}

export function isWindows(platform: string = process.platform) {
    return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(platform) ? true : false;
}
