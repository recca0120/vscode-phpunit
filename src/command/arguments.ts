const minimist = require('minimist');

import { tap } from '../helpers';

export class Arguments {
    private options: any;

    constructor(options: string[] = []) {
        this.options = this.parseOptions(options);
    }

    has(key: string) {
        return !!this.options[this.normalizeKey(key)];
    }

    put(key: string, value: any) {
        this.options[this.normalizeKey(key)] = value;

        return this;
    }

    get(key: string) {
        return this.options[this.normalizeKey(key)];
    }

    remove(key: string) {
        delete this.options[this.normalizeKey(key)];
    }

    toArray() {
        return tap(Object.keys(this.options).filter(key => key !== '_'), (keys: string[]) => {
            keys.sort();
        }).reduce((prev: string[], key: string) => {
            const k = key.length === 1 ? `-${key}` : `--${key}`;
            let value = this.get(key);

            if (['d', 'include-path'].indexOf(key) === -1 && value instanceof Array) {
                value = value[value.length - 1];
            }

            if (key === 'colors') {
                return prev.concat(`--colors=${value}`);
            }

            if (value === true) {
                return prev.concat([k]);
            }

            if (!value) {
                return prev;
            }

            return value instanceof Array
                ? value.reduce((opts, v) => {
                      return opts.concat([k, v]);
                  }, prev)
                : prev.concat([k, value]);
        }, this.options._);
    }

    private normalizeKey(key: string) {
        return key.replace(/^-+/g, '');
    }

    private parseOptions(opts: string[]) {
        return tap(
            minimist(opts, {
                boolean: ['teamcity'],
            }),
            (options: any) => {
                options['log-junit'] = false;
                if (options['c'] || options['configuration']) {
                    options['c'] = options['c'] || options['configuration'];
                    options['configuration'] = false;
                }
            }
        );
    }
}
