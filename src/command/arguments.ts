import { minimist, tap } from '../helpers';

export class Arguments {
    private options: any;

    constructor(options: string[] = []) {
        this.options = this.parseOptions(options);
    }

    has(key) {
        return !!this.options[this.normalizeKey(key)];
    }

    put(key, value) {
        this.options[this.normalizeKey(key)] = value;

        return this;
    }

    get(key) {
        return this.options[this.normalizeKey(key)];
    }

    remove(key) {
        delete this.options[this.normalizeKey(key)];
    }

    toArray() {
        return tap(Object.keys(this.options).filter(key => key !== '_'), keys => {
            keys.sort();
        }).reduce((prev, key) => {
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

    private normalizeKey(key) {
        return key.replace(/^-+/g, '');
    }

    private parseOptions(opts: string[]) {
        return tap(
            minimist(opts, {
                boolean: ['teamcity'],
            }),
            options => {
                options['log-junit'] = false;
                if (options['c'] || options['configuration']) {
                    options['c'] = options['c'] || options['configuration'];
                    options['configuration'] = false;
                }
            }
        );
    }
}
