import {
    IConnection,
    TextDocuments,
    createConnection,
    ProposedFeatures,
    InitializeResult,
    DidChangeConfigurationParams,
    CodeLens,
    CodeLensParams,
    TextDocument,
    ExecuteCommandParams,
    Diagnostic,
    DocumentSymbolParams,
    SymbolInformation,
} from 'vscode-languageserver';
import { PhpUnit } from './phpunit';
import { tap } from './helpers';
import { FilesystemContract, Filesystem } from './filesystem';

// The settings interface describe the server relevant settings part
interface Settings {
    phpunit: PhpUnitSettings;
}

// These are the example settings we defined in the client's package.json
// file
interface PhpUnitSettings {
    execPath: string;
    args: string[];
}

export class LangServer {
    constructor(
        private connection: IConnection = createConnection(ProposedFeatures.all),
        private documents: TextDocuments = new TextDocuments(),
        private phpUnit: PhpUnit = new PhpUnit(),
        private files: FilesystemContract = new Filesystem()
    ) {}

    init(): LangServer {
        this.documents.listen(this.connection);
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this));
        this.connection.onCodeLens(this.onCodeLens.bind(this));
        this.connection.onExecuteCommand(this.onExecuteCommand.bind(this));
        this.connection.onRequest('assertions', (params: any) => {
            this.sendAssertionNotification(params.uri);
        });
        this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));

        return this;
    }

    listen() {
        this.connection.listen();
    }

    private onInitialize(): InitializeResult {
        return {
            capabilities: {
                // Tell the client that the server works in FULL text document sync mode
                textDocumentSync: this.documents.syncKind,
                // Tell the client that the server support code complete
                // completionProvider: {
                //     resolveProvider: true,
                // },
                codeLensProvider: {
                    resolveProvider: true,
                },
                documentSymbolProvider: true,
                executeCommandProvider: {
                    commands: [
                        'phpunit.test',
                        'phpunit.test.file',
                        'phpunit.test.suite',
                        'phpunit.test.nearest',
                        'phpunit.test.last',
                    ],
                },
            },
        };
    }

    private onDidChangeConfiguration(change: DidChangeConfigurationParams): void {
        const settings = change.settings as Settings;
        this.phpUnit.setBinary(settings.phpunit.execPath).setDefault(settings.phpunit.args);
    }

    private onCodeLens(params: CodeLensParams): CodeLens[] {
        const textDocument: TextDocument = this.documents.get(params.textDocument.uri);

        return this.phpUnit.getCodeLens(textDocument.getText(), textDocument.uri);
    }

    private async onExecuteCommand(params: ExecuteCommandParams): Promise<void> {
        const p: any = params.arguments || [];
        const uri: string = p[0] || '';
        const path: string = p[1] || '';
        const args: string[] = p[2] || [];

        this.connection.sendNotification('running');
        (await this.executeCommand(params.command, path, args)).sendDiagnostics().sendAssertionNotification(uri);
        this.connection.sendNotification('done', this.phpUnit.getState());
        this.connection.console.log(this.phpUnit.getOutput());
    }

    private onDocumentSymbol(params: DocumentSymbolParams): SymbolInformation[] {
        const textDocument: TextDocument = this.documents.get(params.textDocument.uri);

        return this.phpUnit.getDocumentSymbols(textDocument.getText(), textDocument.uri);
    }

    private sendAssertionNotification(pathOrUri: string): LangServer {
        return tap(this, () => {
            const uri: string = this.files.uri(pathOrUri);
            this.connection.sendNotification('assertions', {
                uri: uri,
                assertions: this.phpUnit.getAssertions(uri),
            });
        });
    }

    private sendDiagnostics(): LangServer {
        return tap(this, () => {
            this.phpUnit.getDiagnoics().forEach((diagnostics: Diagnostic[], uri: string) => {
                this.connection.sendDiagnostics({
                    uri,
                    diagnostics,
                });
            });
        });
    }

    private async executeCommand(command: string, path: string, args: string[]): Promise<LangServer> {
        switch (command) {
            case 'phpunit.test.nearest':
                await this.phpUnit.runNearest(path, args);
                break;

            case 'phpunit.test.last':
                await this.phpUnit.runLast(path, args);
                break;

            default:
                await this.phpUnit.run(path, args);
                break;
        }

        return this;
    }
}
