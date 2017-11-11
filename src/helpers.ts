import * as X2JS from 'x2js';
import * as _minimist from 'minimist';
import * as _minimistString from 'minimist-string';

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

const x2js = new X2JS();
export function xml2js(content): Promise<any> {
    return new Promise(resolve => {
        resolve(x2js.xml2js(content));
    });
}
