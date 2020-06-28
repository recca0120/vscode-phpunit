import files from './Filesystem';
import URI from 'vscode-uri';
import { Command } from 'vscode-languageserver-protocol';
import { PathLike } from 'fs';
import { Process } from './Process';
import { SpawnOptions } from 'child_process';

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
    private lastOutput: string = '';
    private relativeFilePath: boolean = false;
    private lastCommand: Command = {
        title: '',
        command: '',
        arguments: [],
    };

    constructor(private process = new Process(), private _files = files) {}

    setPhpBinary(phpBinary: PathLike | URI | undefined) {
        this.phpBinary = phpBinary ? this._files.asUri(phpBinary).fsPath : '';

        return this;
    }

    setPhpUnitBinary(phpUnitBinary: PathLike | URI | undefined) {
        this.phpUnitBinary = phpUnitBinary
            ? this._files.asUri(phpUnitBinary).fsPath
            : '';

        return this;
    }

    setArgs(args: string[] | undefined) {
        this.args = args || [];

        return this;
    }

    setRelativeFilePath(relativeFilePath: boolean) {
        this.relativeFilePath = relativeFilePath;

        return this;
    }

    async rerun(p?: Params, options?: SpawnOptions) {
        if (p && this.lastArgs.length === 0) {
            return await this.run(p, options);
        }

        return await this.doRun(this.lastArgs, options);
    }

    async run(p?: Params, options?: SpawnOptions) {
        if (!p) {
            return await this.doRun([], options);
        }

        const params = [];
        const deps: string[] = [];

        if (p.method) {
            deps.push(p.method);
        }

        if (p.depends) {
            deps.push(...p.depends);
        }

        if (deps.length > 0) {
            params.push('--filter');
            params.push(`'/^.*::${deps.join('|')}.*$/'`);
        }

        if (p.file) {
            let testFilePath = this._files.asUri(p.file).fsPath;
            if (this.relativeFilePath && options && options.cwd) {
                testFilePath = testFilePath.replace(new RegExp(options.cwd.replace(/\\/g, '\\\\') + '[\\/\\\\]'), '');
            }
            params.push(testFilePath);
        }

        return await this.doRun(params, options);
    }

    async doRun(args: string[] = [], options?: SpawnOptions) {
        try {
            this.lastArgs = args;
            this.lastCommand = await this.toCommand(args, options);
            this.lastOutput = await this.process.run(this.lastCommand, options);

            return 0;
        } catch (e) {
            return 1;
        }
    }

    getOutput() {
        return this.lastOutput;
    }

    getCommand() {
        return this.lastCommand;
    }

    cancel(): boolean {
        const killed = this.process.kill();
        this.lastOutput = '';
        this.lastCommand = {
            title: '',
            command: '',
            arguments: [],
        };

        return killed;
    }

    private async toCommand(
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
