import { Command } from 'vscode-languageserver-types';
import { Filesystem, FilesystemContract } from '../filesystem';
import { JUnit } from './junit';
import { os, OS, tap, value } from '../helpers';
import { Parameters } from './parameters';
import { Process } from './process';
import { Test } from './common';
import { EventEmitter } from 'events';

export class Cli {
    private binary: string = '';
    private defaults: string[] = [];
    private output: string = '';
    private tests: Test[] = [];

    constructor(
        private files: FilesystemContract = new Filesystem(),
        private process: Process = new Process(),
        private parameters = new Parameters(),
        private jUnit: JUnit = new JUnit(),
        private dispatcher: EventEmitter = new EventEmitter()
    ) {}

    setBinary(binary: string): Cli {
        return tap(this, () => {
            this.binary = binary;
        });
    }

    setDefault(args: string[]): Cli {
        return tap(this, () => {
            this.defaults = args;
        });
    }

    async run(path: string, params: string[] = [], cwd: string = process.cwd()): Promise<number> {
        if (path !== '') {
            path = this.files.normalizePath(path);
            cwd = this.files.dirname(path);
        }

        const root: string = await this.getRoot(cwd);

        const command: Command = {
            title: '',
            command: await this.getBinary(cwd, root),
            arguments: await this.getArguments(params, path, cwd, root),
        };

        this.dispatcher.emit('running', path, params, command);
        this.output = await this.process.spawn(command);
        this.tests = await this.jUnit.parseFile(this.parameters.get('--log-junit'));
        this.dispatcher.emit('done', this.output, this.tests, path, params, command);

        return 0;
    }

    getOutput(): string {
        return this.output;
    }

    getTests(): Test[] {
        return this.tests;
    }

    on(eventName: string, cb: any): Cli {
        return tap(this, () => this.dispatcher.on(eventName, cb));
    }

    once(eventName: string, cb: any): Cli {
        return tap(this, () => this.dispatcher.once(eventName, cb));
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

    private async getArguments(params: string[], path: string, cwd: string, root: string): Promise<string[]> {
        return await this.parameters
            .setCwd(cwd)
            .setRoot(root)
            .set(this.defaults.concat(params.concat([path]).filter((item: string) => !!item)))
            .all();
    }
}
