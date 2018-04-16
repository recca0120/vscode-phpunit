import { Command } from 'vscode-languageserver-types';
import { Filesystem, FilesystemContract } from '../filesystem';
import { JUnit } from './junit';
import { os, OS, tap, value } from '../helpers';
import { Parameters } from './parameters';
import { Process } from '../process';
import { Test } from './common';

export class PhpUnit {
    private binary: string = '';
    private defaults: string[] = [];
    private output: string = '';
    private tests: Test[] = [];

    constructor(
        private files: FilesystemContract = new Filesystem(),
        private process: Process = new Process(),
        private parameters = new Parameters(files),
        private jUnit: JUnit = new JUnit()
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

    async run(path: string, params: string[] = [], cwd: string = process.cwd()): Promise<number> {
        if (path) {
            path = this.files.normalizePath(path);
            cwd = this.files.dirname(path);
        }
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

    private async parseTests(jUnitDotXml: string): Promise<Test[]> {
        return jUnitDotXml && (await this.files.exists(jUnitDotXml)) === true
            ? tap(await this.jUnit.parseFile(jUnitDotXml), () => {
                  this.files.unlink(jUnitDotXml);
              })
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
