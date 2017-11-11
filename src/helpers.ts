import _minimist = require('minimist');
const _minimistString = require('minimist-string');
const x2jsCore = require('x2js');

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

const x2js = new x2jsCore();
export function xml2js(content): Promise<any> {
    return new Promise(resolve => {
        resolve(x2js.xml2js(content));
    });
}
