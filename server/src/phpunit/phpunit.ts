import { FilesystemContract, Filesystem } from '../filesystem';
import { os, OS, tap, value } from '../helpers';
import { Process } from '../process';
import { Command, IConnection } from 'vscode-languageserver';
import { Parameters } from './parameters';
import { Test } from './common';
import { Testsuite } from './testsuite';

export class PhpUnit {
    private binary: string;
    private defaults: string[] = [];
    private output: string;
    private tests: Test[];

    constructor(
        private files: FilesystemContract = new Filesystem(),
        private process: Process = new Process(),
        private parameters = new Parameters(files),
        private testsuite: Testsuite = new Testsuite()
    ) {}

    setBinary(binary: string): PhpUnit {
        return tap(this, (phpUnit: PhpUnit) => {
            phpUnit.binary = binary;
        });
    }

    setDefault(args: string[]): PhpUnit {
        return tap(this, (phpUnit: PhpUnit) => {
            phpUnit.defaults = args;
        });
    }

    async run(path: string, params: string[] = []): Promise<number> {
        path = this.files.normalizePath(path);
        const cwd: string = this.files.dirname(path);
        const root: string = await this.getRoot(cwd);

        const command: Command = {
            title: '',
            command: await this.getBinary(cwd, root),
            arguments: await this.parameters
                .setCwd(cwd)
                .setRoot(root)
                .set(this.defaults.concat(params.concat([path]).filter((item: string) => !!item)))
                .all(),
        };

        this.output = await this.process.spawn(command);
        this.tests = await this.parseTests(this.parameters.get('--log-junit'));

        return 0;
    }

    getOutput(): string {
        return this.output;
    }

    getTests(): Test[] {
        return this.tests;
    }

    sendDiagnostics(connection: IConnection): PhpUnit {
        return tap(this, () => {
            for (const [, params] of this.testsuite.getDiagnostics()) {
                connection.sendDiagnostics(params);
            }
        });
    }

    sendNotification(connection: IConnection, uri: string): PhpUnit {
        return tap(this, () => {
            connection.sendNotification('assertions', {
                uri: uri,
                assertions: this.testsuite.getAssertions(uri),
            });
        });
    }

    private async parseTests(jUnitDotXml: string): Promise<Test[]> {
        return jUnitDotXml && (await this.files.exists(jUnitDotXml)) === true
            ? await this.testsuite.parseJUnit(await this.files.get(jUnitDotXml))
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
