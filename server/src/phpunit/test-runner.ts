import { Process } from '../support/process';
import { Filesystem, Factory as FilesystemFactory } from '../filesystem';
import { Command } from 'vscode-languageserver-types';
import { Argument } from './argument';
import { TestResult } from './test-result';
import { JUnitParser } from './junit-parser';
import { Test } from './common';

export class TestRunner {
    private binary: string = '';
    private defaults: string[] = [];

    constructor(
        private process: Process = new Process(),
        private args: Argument = new Argument(),
        private files: Filesystem = new FilesystemFactory().create(),
        private parser: JUnitParser = new JUnitParser()
    ) {}

    setBinary(binary: string): TestRunner {
        this.binary = binary;

        return this;
    }

    setDefaults(defaults: string[]): TestRunner {
        this.defaults = defaults;

        return this;
    }

    async handle(
        path: string = '',
        args: string[] = [],
        currentDirectory: string = process.cwd()
    ): Promise<TestResult> {
        if (path !== '') {
            path = this.files.normalizePath(path);
            currentDirectory = this.files.dirname(path);
        }

        const root: string = await this.getRoot(currentDirectory);
        const command: Command = {
            title: '',
            command: await this.getBinary(currentDirectory, root),
            arguments: await this.mergeArguments(args, path, currentDirectory, root),
        };

        const output: string = await this.process.spawn(command);

        const junit: string = this.args.get('--log-junit');
        const tests: Test[] = await this.parser.parse(await this.files.get(junit));
        this.files.unlink(junit);

        return new TestResult().setTests(tests).setOutput(output);
    }

    private async getRoot(currentDirectory: string): Promise<string> {
        const composerFile = await this.files.findUp('composer.json', currentDirectory);

        return composerFile ? this.files.dirname(composerFile) : currentDirectory;
    }

    private async getBinary(currentDirectory: string, root: string): Promise<string> {
        if (this.binary) {
            return this.binary;
        }

        const binary: string = await this.files.findUp(`vendor/bin/phpunit`, currentDirectory, root);

        if (binary) {
            return binary;
        }

        return await this.files.which('phpunit');
    }

    private async mergeArguments(
        args: string[],
        path: string,
        currentDirectory: string,
        root: string
    ): Promise<string[]> {
        return await this.args
            .setDirectory(currentDirectory)
            .setRoot(root)
            .set(this.defaults.concat(args.concat([path]).filter((item: string) => !!item)))
            .all();
    }
}
