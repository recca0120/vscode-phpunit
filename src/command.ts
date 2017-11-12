import { minimist, tap } from './helpers';

import { Filesystem } from './filesystem';
import { State } from './phpunit';
import {container} from './container';

interface CommandOptions {
    rootPath: string;
    junitPath?: string;
}

export class Command {
    public temp = [
        '',
        'xml',
    ];

    constructor(
        private fileName: string,
        private parameters: string[] = [],
        private execPath: string = '',
        public options: CommandOptions = {
            rootPath: __dirname,
        },
        private files: Filesystem = container.files
    ) {
        const filename = 'vscode-phpunit-junit';
        const time = new Date().getTime();
        this.temp[0] = this.files.tmpfile(`${filename}-${time}`);
    }

    getTempfile() {
        return this.temp.join('.');
    }

    args() {
        const execPath = !this.execPath || this.execPath.trim() === 'phpunit' ? this.getExecutable() : this.execPath;

        if (!execPath) {
            throw State.PHPUNIT_NOT_FOUND;
        }

        return this.parseOptions([execPath].concat(this.parameters)).concat([this.fileName]);
    }

    dispose() {
        this.files.unlink(this.getTempfile());
    }

    get rootPath() {
        return this.options.rootPath;
    }

    private parseOptions(args: string[]) {
        const parseOptions = tap(
            minimist(args, {
                boolean: ['teamcity'],
            }),
            options => {
                if (!options.c && !options.configuration) {
                    const configuration = this.getConfiguration();
                    if (configuration) {
                        options.configuration = configuration;
                    }
                }

                if (options.c && options.configuration) {
                    options.configuration = false;
                }

                if (!options['log-junit']) {
                    options['log-junit'] = this.getTempfile();
                }

                if (options.teamcity) {
                    options['log-junit'] = false;
                }
            }
        );

        return tap(Object.keys(parseOptions).filter(key => key !== '_'), keys => {
            keys.sort();
        }).reduce((prev, key) => {
            const k = key.length === 1 ? `-${key}` : `--${key}`;
            let value = parseOptions[key];

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
        }, parseOptions._);
    }

    private getConfiguration(): string {
        return ['phpunit.xml', 'phpunit.xml.dist']
            .map(configurationFile => `${this.options.rootPath}/${configurationFile}`)
            .find(configurationFile => this.files.exists(configurationFile));
    }

    private getExecutable(): string {
        return [`${this.options.rootPath}/vendor/bin/phpunit`, `${this.options.rootPath}/phpunit.phar`, 'phpunit']
            .map(path => this.files.find(path))
            .find(command => command !== '');
    }
}
