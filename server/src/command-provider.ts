import { TestRunner } from './phpunit/test-runner';
import { TestResult } from './phpunit/test-result';
import { CodeLens } from 'vscode-languageserver-types';
import { CodeLensProvider } from './codelens-provider';

export class CommandProvider {
    public commands: string[] = [
        'phpunit.test.suite',
        'phpunit.test.file',
        'phpunit.test.nearest',
        'phpunit.test.last',
        'phpunit.test',
    ];

    private lastArgs: any = {
        uri: '',
        args: [],
    };

    constructor(
        private codeLenProvider: CodeLensProvider = new CodeLensProvider(),
        private testRunner = new TestRunner()
    ) {}

    settings(settings: any) {
        this.testRunner.setBinary(settings.execPath).setDefaults(settings.args);
    }

    async handle(uri: string, args: string[] = []): Promise<TestResult> {
        Object.assign(this.lastArgs, { uri, args });

        return await this.testRunner.handle(uri, args);
    }

    async handleNearest(uri: string, lineAt: number): Promise<TestResult> {
        const codeLens: CodeLens = await this.codeLenProvider.fromLine(uri, lineAt);

        const { args } = codeLens.command.arguments[0];

        return await this.handle(uri, args);
    }

    async handleLast(): Promise<TestResult> {
        return await this.handle(this.lastArgs.uri, this.lastArgs.args);
    }

    getLastArgs(): any {
        return this.lastArgs;
    }
}
