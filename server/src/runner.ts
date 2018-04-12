import { PhpUnit, Ast, TestNode } from './phpunit';
import { Collection } from './collection';
import { tap } from './helpers';
import { IConnection, PublishDiagnosticsParams } from 'vscode-languageserver/lib/main';
import { FilesystemContract, Filesystem } from './filesystem';

export class Runner {
    constructor(
        private phpUnit: PhpUnit = new PhpUnit,
        private collect: Collection = new Collection,
        private ast: Ast = new Ast,
        private files: FilesystemContract = new Filesystem
    ) {}

    getTestNodes(code: string, uri: string): TestNode[] {
        return this.ast.parse(code, this.files.uri(uri));
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
            this.collect.transformToDiagnoics().forEach((params: PublishDiagnosticsParams) => {
                connection.sendDiagnostics(params);
            });
        });
    }

    sendNotification(connection: IConnection, uri: string): Runner {
        return tap(this, () => {
            connection.sendNotification('assertions', {
                uri: uri,
                assertions: this.collect.transformToAssertions().get(uri),
            });
        });
    }
}