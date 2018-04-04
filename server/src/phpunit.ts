import { FilesystemContract, files as fileSystem } from './filesystem';
import { os, OS } from './helpers';
import { Process } from './process';
import { ExecuteCommandParams, Command } from 'vscode-languageserver';

export class PhpUnit {
    protected binary: string;
    protected args: string[] = [];

    constructor(private files: FilesystemContract = fileSystem, private process: Process = new Process()) {}

    setBinary(binary: string): PhpUnit {
        this.binary = binary;

        return this;
    }

    setArgs(args: string[]): PhpUnit {
        this.args = args;

        return this;
    }

    async run(params: ExecuteCommandParams): Promise<string> {
        const path: string = (params.arguments[0] = this.files.normalizePath(params.arguments[0]));
        const cwd: string = this.files.dirname(path);
        const root: string = await this.getRoot(cwd);

        const command: Command = {
            command: await this.getBinary(cwd, root),
            arguments: this.args.concat(params.arguments as string[]),
            title: '',
        };

        const phpUnitDotXml: string = await this.getPhpUnitDotXml(cwd, root);
        if (phpUnitDotXml) {
            command.arguments = command.arguments.concat(['-c', phpUnitDotXml]);
        }

        return await this.process.spawn(command);
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
