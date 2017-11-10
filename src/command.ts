import { Filesystem } from './filesystem';
import { State } from './phpunit';

const minimist = require('minimist');

interface CommandOptions {
    rootPath: string;
    junitPath?: string;
}

export class Command {
    private xml: string;

    constructor(
        private fileName: string,
        private args: Array<string> = [],
        private execPath: string = '',
        public options: CommandOptions = {
            rootPath: __dirname,
        },
        private files = new Filesystem()
    ) {
        this.execPath = !this.execPath || this.execPath.trim() === 'phpunit' ? this.getExecutable() : this.execPath;
        this.xml = this.files.tmpfile(`vscode-phpunit-junit-${new Date().getTime()}.xml`);
    }

    getXML() {
        return this.xml;
    }

    toArray() {
        const execPath = this.execPath;

        if (!execPath) {
            throw State.PHPUNIT_NOT_FOUND;
        }

        const args = this.getConfiguration()
            .concat(this.args)
            .concat(['--log-junit', this.getXML()]);

        return [execPath].concat(this.parseOptions(args)).concat([this.fileName]);
    }

    clear() {
        this.files.unlink(this.getXML());
    }

    get rootPath() {
        return this.options.rootPath;
    }

    private parseOptions(args: Array<string>) {
        const parseOptions = minimist(args);
        const keys = Object.keys(parseOptions).filter(key => key !== '_');
        keys.sort();

        return keys.reduce((prev, key) => {
            const k = key.length === 1 ? `-${key}` : `--${key}`
            let value = parseOptions[key];

            if (['d', 'include-path'].indexOf(key) === -1 && value instanceof Array) {
                value = value[value.length -1];
            }

            if (key === 'colors') {
                return prev.concat(`--colors=${value}`)
            }

            return value instanceof Array
                ? value.reduce((opts, v) => {
                    return opts.concat([k, v]);
                }, prev)
                : prev.concat([k, value])
        }, parseOptions._);
    }

    private getConfiguration(): Array<string> {
        const configurationFile = ['phpunit.xml', 'phpunit.xml.dist']
            .map(configurationFile => `${this.options.rootPath}/${configurationFile}`)
            .find(configurationFile => this.files.exists(configurationFile));

        return configurationFile ? ['--configuration', configurationFile] : [];
    }

    private getExecutable(): string {
        return [`${this.options.rootPath}/vendor/bin/phpunit`, `${this.options.rootPath}/phpunit.phar`, 'phpunit']
            .map(path => this.files.find(path))
            .find(command => command !== '');
    }
}
