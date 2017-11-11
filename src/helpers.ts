const _minimist = require('minimist');
const _minimistString = require('minimist-string');

export function isWindows(): boolean {
    return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(process.platform);
}

export function tap(val: any, callback: Function): any {
    callback(val);

    return val;
}

export function minimist(...x) {
    return _minimist(...x);
}

export function minimistString(...x) {
    return _minimistString(...x);
}
