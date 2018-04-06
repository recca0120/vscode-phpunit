import { FilesystemContract, files as filesystem } from '../filesystem';
import { os, OS, tap, value } from '../helpers';
import { Process } from '../process';
import { ExecuteCommandParams, Command } from 'vscode-languageserver';
import { PhpUnitArguments } from './phpunit-arguments';
import { Test } from './junit';
import { Testsuite } from './testsuite';

export interface Result {
    output: string;
    tests: Test[];
}

export class PhpUnit {
    protected binary: string;
    protected arguments: string[] = [];

    constructor(
        private files: FilesystemContract = filesystem,
        private process: Process = new Process(),
        private phpUnitArguments = new PhpUnitArguments(filesystem),
        private testSuite: Testsuite = new Testsuite()
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

    async run(params: ExecuteCommandParams): Promise<Result> {
        params.arguments[0] = this.files.normalizePath(params.arguments[0]);
        const cwd: string = this.files.dirname(params.arguments[0]);
        const root: string = await this.getRoot(cwd);

        this.phpUnitArguments
            .setCwd(cwd)
            .setRoot(root)
            .set(this.arguments.concat(params.arguments as string[]));

        const command: Command = {
            command: await this.getBinary(cwd, root),
            arguments: await this.phpUnitArguments.all(),
            title: '',
        };

        return {
            output: await this.process.spawn(command),
            tests: await this.getTests(),
        };
    }

    private async getTests(): Promise<Test[]> {
        const jUnitDotXml = this.phpUnitArguments.get('--log-junit');

        return jUnitDotXml && (await this.files.exists(jUnitDotXml)) === true
            ? this.testSuite.parseJUnit(await this.files.get(jUnitDotXml))
            : [];
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
