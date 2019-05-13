import _files from './Filesystem';
import URI from 'vscode-uri';
import { PathLike } from 'fs';
import { Process } from './Process';
import { Command } from 'vscode-languageserver-protocol';

interface Params {
    file?: PathLike | URI;
    method?: string;
    depends?: string[];
}

export class TestRunner {
    private phpBinary = '';
    private phpUnitBinary = '';
    private args: string[] = [];
    private lastArgs: string[] = [];

    constructor(private process = new Process(), private files = _files) {}

    setPhpBinary(phpBinary: PathLike | URI) {
        this.phpBinary = this.files.asUri(phpBinary).fsPath;

        return this;
    }

    setPhpUnitBinary(phpUnitBinary: PathLike | URI) {
        this.phpUnitBinary = this.files.asUri(phpUnitBinary).fsPath;

        return this;
    }

    setArgs(args: string[]) {
        this.args = args;

        return this;
    }

    async rerun(_params?: Params) {
        if (_params && this.lastArgs.length === 0) {
            return await this.run(_params);
        }

        return await this.doRun(this.lastArgs);
    }

    async run(_params?: Params) {
        const params = [];
        const deps: string[] = [];

        if (_params && _params.file) {
            params.push(this.files.asUri(_params.file).fsPath);
        }

        if (_params && _params.method) {
            deps.push(_params.method);
        }

        if (_params && _params.depends) {
            deps.push(..._params.depends);
        }

        if (deps.length > 0) {
            params.push('--filter');
            params.push(`^.*::(${deps.join('|')})( with data set .*)?$`);
        }

        return await this.doRun(params);
    }

    async doRun(args: string[] = []) {
        this.lastArgs = args;

        return await this.process.run(await this.getCommand(args));
    }

    cancel(): boolean {
        return this.process.kill();
    }

    private async getCommand(args: string[]): Promise<Command> {
        let thisArgs = [];

        const phpBinary = this.getPhpBinary();

        if (phpBinary) {
            thisArgs.push(phpBinary);
        }

        const phpUnitBinary = await this.getPhpUnitBinary();

        if (phpUnitBinary) {
            thisArgs.push(phpUnitBinary);
        }

        thisArgs = thisArgs.concat(this.args, args).filter(arg => !!arg);

        return {
            title: 'PHPUnit LSP',
            command: thisArgs.shift(),
            arguments: thisArgs,
        };
    }

    private getPhpBinary(): string {
        return this.phpBinary;
    }

    private async getPhpUnitBinary(): Promise<string | void> {
        if (this.phpUnitBinary) {
            return this.phpUnitBinary;
        }

        return await this.files.findup(['vendor/bin/phpunit', 'phpunit']);
    }
}
