import { PHPUnitOutput, ProblemMatcher } from './ProblemMatcher';
import files from './Filesystem';
import URI from 'vscode-uri';
import { Command } from 'vscode-languageserver-protocol';
import { PathLike } from 'fs';
import { Process } from './Process';
import { SpawnOptions } from 'child_process';
import { TestResponse } from './TestResponse';

export interface Params {
    file?: PathLike | URI;
    method?: string;
    depends?: string[];
}

export class TestRunner {
    private phpBinary = '';
    private phpUnitBinary = '';
    private args: string[] = [];
    private lastArgs: string[] = [];

    constructor(
        private process = new Process(),
        private problemMatcher: ProblemMatcher<any> = new PHPUnitOutput(),
        private _files = files
    ) {}

    setPhpBinary(phpBinary: PathLike | URI) {
        this.phpBinary = this._files.asUri(phpBinary).fsPath;

        return this;
    }

    setPhpUnitBinary(phpUnitBinary: PathLike | URI) {
        this.phpUnitBinary = this._files.asUri(phpUnitBinary).fsPath;

        return this;
    }

    setArgs(args: string[]) {
        this.args = args;

        return this;
    }

    async rerun(_params?: Params, options?: SpawnOptions) {
        if (_params && this.lastArgs.length === 0) {
            return await this.run(_params, options);
        }

        return await this.doRun(this.lastArgs);
    }

    async run(_params?: Params, options?: SpawnOptions) {
        if (!_params) {
            return await this.doRun([], options);
        }

        const params = [];
        const deps: string[] = [];

        if (_params.method) {
            deps.push(_params.method);
        }

        if (_params.depends) {
            deps.push(..._params.depends);
        }

        if (deps.length > 0) {
            params.push('--filter');
            params.push(`^.*::(${deps.join('|')})( with data set .*)?$`);
        }

        if (_params.file) {
            params.push(this._files.asUri(_params.file).fsPath);
        }

        return await this.doRun(params, options);
    }

    async doRun(args: string[] = [], options?: SpawnOptions) {
        this.lastArgs = args;
        const command = await this.getCommand(args, options);

        return new TestResponse(
            await this.process.run(command, options),
            command,
            this.problemMatcher
        );
    }

    cancel(): boolean {
        return this.process.kill();
    }

    private async getCommand(
        args: string[],
        spawnOptions?: SpawnOptions
    ): Promise<Command> {
        let params = [];

        const [phpBinary, phpUnitBinary, phpUnitXml] = await Promise.all([
            this.getPhpBinary(),
            this.getPhpUnitBinary(spawnOptions),
            this.getPhpUnitXml(spawnOptions),
        ]);

        if (phpBinary) {
            params.push(phpBinary);
        }

        if (phpUnitBinary) {
            params.push(phpUnitBinary);
        }

        const hasConfiguration = this.args.some((arg: string) =>
            ['-c', '--configuration'].some(key => arg.indexOf(key) !== -1)
        );

        if (!hasConfiguration && phpUnitXml) {
            params.push('-c');
            params.push(phpUnitXml);
        }

        params = params.concat(this.args, args).filter(arg => !!arg);

        return {
            title: 'PHPUnit LSP',
            command: params.shift() as string,
            arguments: params,
        };
    }

    private getPhpBinary(): Promise<string> {
        return Promise.resolve(this.phpBinary);
    }

    private async getPhpUnitBinary(
        spawnOptions?: SpawnOptions
    ): Promise<string | void> {
        if (this.phpUnitBinary) {
            return this.phpUnitBinary;
        }

        return await this._files.findup(
            ['vendor/bin/phpunit', 'phpunit'],
            spawnOptions
        );
    }

    private async getPhpUnitXml(spawnOptions?: SpawnOptions) {
        return await this._files.findup(
            ['phpunit.xml', 'phpunit.xml.dist'],
            spawnOptions
        );
    }
}
