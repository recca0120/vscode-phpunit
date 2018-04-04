import { FilesystemContract, files as fileSystem } from './filesystem';
import { os, OS } from './helpers';
import { Process } from './process';
import { ExecuteCommandParams, Command } from 'vscode-languageserver';

export class PhpUnit {
    protected phpUnitBinary: string;

    constructor(private files: FilesystemContract = fileSystem, private process: Process = new Process()) {}

    setPhpUnitBinary(phpUnitBinary: string): PhpUnit {
        this.phpUnitBinary = phpUnitBinary;

        return this;
    }

    async run(params: ExecuteCommandParams): Promise<string> {
        const path: string = (params.arguments[0] = this.files.normalizePath(params.arguments[0]));
        const cwd: string = this.files.dirname(path);
        const root: string = await this.getRoot(cwd);;

        const cmd: string = await this.getPhpUnitBinary(cwd, root);
        const args: string[] = params.arguments as string[];

        const command: Command = {
            command: cmd,
            arguments: args,
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

    private async getPhpUnitBinary(cwd: string, root: string): Promise<string> {
        if (this.phpUnitBinary) {
            return this.phpUnitBinary;
        }

        const phpUnitBinary: string = `vendor/bin/phpunit${os() === OS.WIN ? '.bat' : ''}`;

        return (await this.files.findUp(phpUnitBinary, cwd, root)) || (await this.files.which('phpunit'));
    }

    private async getPhpUnitDotXml(cwd: string, root: string): Promise<string> {
        return (
            (await this.files.findUp('phpunit.xml', cwd, root)) ||
            (await this.files.findUp('phpunit.xml.dist', cwd, root))
        );
    }
}
