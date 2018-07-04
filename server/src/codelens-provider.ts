import { Method } from './phpunit/common';
import { TestSuite } from './phpunit/test-suite';
import { CodeLens } from 'vscode-languageserver-protocol';

export class CodeLensProvider {
    constructor(private testSuite: TestSuite = new TestSuite()) {}

    formText(text: string, uri: string): CodeLens[] {
        return this.testSuite.parse(text, uri).map((method: Method) => {
            return {
                range: method.range,
                command: {
                    title: 'Run Test',
                    command: this.getCommandName(method),
                    arguments: this.getArguments(method, uri),
                },
                data: {
                    textDocument: {
                        uri: uri,
                    },
                },
            };
        });
    }

    private getCommandName(method: Method): string {
        return method.kind === 'class' ? 'phpunit.test' : 'phpunit.test.file';
    }

    private getArguments(method: Method, uri: string): string[] {
        return method.kind === 'class' ? [uri] : [uri, '--filter', `^.*::${method.name}( with data set .*)?$`];
    }
}
