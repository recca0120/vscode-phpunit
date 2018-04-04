import { FilesystemContract, files as fileSystem } from './filesystem';
import { os, OS, tap } from './helpers';
import { Process } from './process';
import { ExecuteCommandParams, Command } from 'vscode-languageserver';

export class PhpUnit {
    protected binary: string;
    protected args: string[] = [];

    constructor(private files: FilesystemContract = fileSystem, private process: Process = new Process()) {}

    setBinary(binary: string): PhpUnit {
        return tap(this, (phpUnit: PhpUnit) => {
            phpUnit.binary = binary;
        });
    }

    setArgs(args: string[]): PhpUnit {
        return tap(this, (phpUnit: PhpUnit) => {
            phpUnit.args = args;
        });
    }

    async run(params: ExecuteCommandParams): Promise<string> {
        const path: string = (params.arguments[0] = this.files.normalizePath(params.arguments[0]));
        const cwd: string = this.files.dirname(path);
        const root: string = await this.getRoot(cwd);

        let args = this.args.concat(params.arguments as string[]);

        const phpUnitDotXml: string = await this.getPhpUnitDotXml(cwd, root);
        if (phpUnitDotXml && args.some((arg: string) => arg === '-c' || arg === '--configuration') === false) {
            args = args.concat(['-c', phpUnitDotXml]);
        }

        return await this.process.spawn({
            command: await this.getBinary(cwd, root),
            arguments: args,
            title: '',
        } as Command);
    }

    private async getRoot(cwd: string) {
        const composerPath = await this.files.findUp('composer.json', cwd);

        return composerPath ? this.files.dirname(composerPath) : cwd;
    }

    private async getBinary(cwd: string, root: string): Promise<string> {
        if (this.binary) {
            return this.binary;
        }

        const binary: string = `vendor/bin/phpunit${os() === OS.WIN ? '.bat' : ''}`;

        return (await this.files.findUp(binary, cwd, root)) || (await this.files.which('phpunit'));
    }

    private async getPhpUnitDotXml(cwd: string, root: string): Promise<string> {
        return (
            (await this.files.findUp('phpunit.xml', cwd, root)) ||
            (await this.files.findUp('phpunit.xml.dist', cwd, root))
        );
    }
}
