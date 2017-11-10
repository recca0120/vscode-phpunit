import { Filesystem } from './filesystem';
import { State } from './phpunit';

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
        const options = [];
        const multiple = ['-d', '--include-path'];
        const map: Map<string, string> = new Map();

        for (let i = 0; i < args.length; i++) {
            const key = args[i];
            if (key.startsWith('-') === true) {
                const value = args[i + 1];
                const startsWith = value.startsWith('-');
                if (startsWith === false) {
                    i++;
                }

                if (value.startsWith('-') === false) {
                    if (multiple.indexOf(key) !== -1) {
                        const val = map.has(key) ? map.get(key).split('|') : [];
                        map.set(key, val.concat([value]).join('|'));
                    } else {
                        map.set(key, value);
                    }
                } else {
                    map.set(key, null);
                }
            } else {
                options.push(key);
            }
        }

        return [...map.entries()].sort().reduce((opts: Array<string>, item: Array<string>) => {
            const [key, value] = item;
            if (multiple.indexOf(key) !== -1) {
                return value.split('|').reduce((result, value) => {
                    return result.concat([key, value]);
                }, opts);
            }

            return opts.concat(item.filter(v => v !== null));
        }, options);
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
