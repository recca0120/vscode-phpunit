import { PhpUnit, Ast, TestNode, Collection, Assertion, Test } from './phpunit';
import { tap } from './helpers';
import { IConnection, PublishDiagnosticsParams } from 'vscode-languageserver/lib/main';
import { FilesystemContract, Filesystem } from './filesystem';

export class Runner {
    constructor(
        private phpUnit: PhpUnit = new PhpUnit(),
        private collect: Collection = new Collection(),
        private ast: Ast = new Ast(),
        private files: FilesystemContract = new Filesystem()
    ) {}

    getTestNodes(code: string, uri: string): TestNode[] {
        const testNodes = this.ast.parse(code, this.files.uri(uri));

        return testNodes.concat(
            this.collect.getTestNodes(uri).filter((testNode: TestNode) => {
                for (const node of testNodes) {
                    if (node.uri === testNode.uri && testNode.range === testNode.range) {
                        return false;
                    }
                }

                return true;
            })
        );
    }

    setBinary(binary: string): Runner {
        return tap(this, () => {
            this.phpUnit.setBinary(binary);
        });
    }

    setDefault(args: string[]): Runner {
        return tap(this, () => {
            this.phpUnit.setDefault(args);
        });
    }

    async run(path: string, params: string[] = []): Promise<string> {
        await this.phpUnit.run(path, params);
        this.collect.put(this.phpUnit.getTests());

        return this.phpUnit.getOutput();
    }

    sendDiagnostics(connection: IConnection): Runner {
        return tap(this, () => {
            this.collect.getDiagnoics().forEach((params: PublishDiagnosticsParams) => {
                connection.sendDiagnostics(params);
            });
        });
    }

    sendNotification(connection: IConnection, pathOrUri: string): Runner {
        return tap(this, () => {
            const uri: string = this.files.uri(pathOrUri);
            connection.sendNotification('assertions', {
                uri: uri,
                assertions: this.collect.getAssertions().get(uri) || [],
            });
        });
    }
}
