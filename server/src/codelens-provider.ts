import { Method } from './phpunit/common';
import { TestSuite } from './phpunit/test-suite';
import { CodeLens } from 'vscode-languageserver-types';

export class CodeLensProvider {
    constructor(private testSuite: TestSuite = new TestSuite()) {}

    fromText(text: string, uri: string): CodeLens[] {
        return this.testSuite.parse(text, uri).map((method: Method) => this.asCodelens(method, uri));
    }

    async fromLine(uri: string, lineAt: number): Promise<CodeLens> {
        const methods: Method[] = await this.testSuite.parseFile(uri);

        for (const method of methods) {
            const { start, end } = method.range;

            if (method.kind !== 'class' && lineAt >= start.line && lineAt <= end.line) {
                return this.asCodelens(method, uri);
            }
        }

        return this.asCodelens(methods[0], uri);
    }

    private asCodelens(method: Method, uri: string): CodeLens {
        return {
            range: method.range,
            command: {
                title: 'Run Test',
                command: this.getCommandName(method),
                arguments: [this.getArguments(method, uri)],
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
        };
    }

    private getCommandName(method: Method): string {
        return method.kind === 'class' ? 'phpunit.test' : 'phpunit.test.file';
    }

    private getArguments(method: Method, uri: string): any {
        return method.kind === 'class'
            ? { uri, args: [] }
            : { uri, args: ['--filter', `^.*::${method.name}( with data set .*)?$`] };
    }
}
