import { Process } from './process';
import { Filesystem, Factory as FilesystemFactory } from './filesystem';
import { Command } from 'vscode-languageserver-types';
import { Argument } from './argument';
import { TestResults } from './test-results';

export class TestRunner {
    private binary: string = '';
    private defaults: string[] = [];

    constructor(
        private process: Process = new Process(),
        private args: Argument = new Argument(),
        private files: Filesystem = new FilesystemFactory().create()
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
    ): Promise<TestResults> {
        if (path !== '') {
            path = this.files.normalizePath(path);
            currentDirectory = this.files.dirname(path);
        }

        const root: string = await this.getRoot(currentDirectory);
        const command: Command = {
            title: '',
            command: await this.getBinary(currentDirectory, root),
            arguments: await this.getArguments(args, path, currentDirectory, root),
        };

        return new TestResults(await this.process.spawn(command), this.args);
    }

    private async getRoot(currentDirectory: string): Promise<string> {
        const composerFile = await this.files.findUp('composer.json', currentDirectory);

        return composerFile ? this.files.dirname(composerFile) : currentDirectory;
    }

    private async getBinary(currentDirectory: string, root: string): Promise<string> {
        if (this.binary) {
            return this.binary;
        }

        return (
            (await this.files.findUp(`vendor/bin/phpunit`, currentDirectory, root)) ||
            (await this.files.which('phpunit'))
        );
    }

    private async getArguments(
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
