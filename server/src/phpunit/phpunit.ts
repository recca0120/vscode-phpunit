import { FilesystemContract, files as filesystem } from '../filesystem';
import { os, OS, tap, value } from '../helpers';
import { Process } from '../process';
import { ExecuteCommandParams, Command } from 'vscode-languageserver';
import { PhpUnitArguments } from './phpunit-arguments';

export class PhpUnit {
    protected binary: string;
    protected arguments: string[] = [];

    constructor(
        private files: FilesystemContract = filesystem,
        private process: Process = new Process(),
        private phpUnitArguments = new PhpUnitArguments(filesystem)
    ) {}

    setBinary(binary: string): PhpUnit {
        return tap(this, (phpUnit: PhpUnit) => {
            phpUnit.binary = binary;
        });
    }

    setArguments(args: string[]): PhpUnit {
        return tap(this, (phpUnit: PhpUnit) => {
            phpUnit.arguments = args;
        });
    }

    async run(params: ExecuteCommandParams): Promise<string> {
        params.arguments[0] = this.files.normalizePath(params.arguments[0]);
        const cwd: string = this.files.dirname(params.arguments[0]);
        const root: string = await this.getRoot(cwd);

        this.phpUnitArguments
            .setArguments(this.arguments.concat(params.arguments as string[]))
            .setCwd(cwd)
            .setRoot(root);

        const command: Command = {
            command: await this.getBinary(cwd, root),
            arguments: await this.phpUnitArguments.getArguments(),
            title: '',
        };

        const output: string = await this.process.spawn(command);

        const jUnitDotXml = this.phpUnitArguments.getJUnitDotXml();
        if (jUnitDotXml && (await this.files.exists(jUnitDotXml))) {
            this.files.unlink(jUnitDotXml);
        }

        console.log(JSON.stringify(command));

        return output;
    }

    private async getRoot(cwd: string): Promise<string> {
        return value(await this.files.findUp('composer.json', cwd), (composerPath: string) => {
            return composerPath ? this.files.dirname(composerPath) : cwd;
        });
    }

    private async getBinary(cwd: string, root: string): Promise<string> {
        if (this.binary) {
            return this.binary;
        }

        return (
            (await this.files.findUp(`vendor/bin/phpunit${os() === OS.WIN ? '.bat' : ''}`, cwd, root)) ||
            (await this.files.which('phpunit'))
        );
    }
}
