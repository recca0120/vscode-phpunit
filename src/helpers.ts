import * as x2js from 'x2js';
export const minimist = require('minimist');
export const minimistString = require('minimist-string');

export const xml2js = (function() {
    const instance = new x2js();

    return function(content): any {
        return new Promise(resolve => {
            resolve(instance.xml2js(content));
        });
    };
})();

export function isWindows(): boolean {
    return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(process.platform);
}

export function tap(val: any, callback: Function): any {
    callback(val);

    return val;
}
