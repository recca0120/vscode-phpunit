export const minimist = require('minimist');

export const minimistString = require('minimist-string');

import * as x2js from 'x2js';

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

export function normalizePath(path: string): string {
    return !path
        ? ''
        : path
              .trim()
              .replace(/^(\w):/i, m => {
                  return `/${m[0].toLowerCase()}`;
              })
              .replace(/\\/g, '/')
              .replace(/ /g, '%20');
}

export function noANSI(message: string): string {
    return message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}
