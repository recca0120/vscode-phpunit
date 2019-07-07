import { Snippets } from './Snippets';
import { WorkspaceFolders } from './WorkspaceFolders';
import {
    createConnection,
    TextDocuments,
    // TextDocument,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    ExecuteCommandParams,
    // Position,
    // MessageType,
    // LogMessageNotification,
    // WillSaveTextDocumentWaitUntilRequest,
    // TextDocumentSaveReason,
    WorkspaceFolder as _WorkspaceFolder,
    CompletionItem,
    FileChangeType,
} from 'vscode-languageserver';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
const snippets = new Snippets();
const workspaceFolders = new WorkspaceFolders(connection);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    workspaceFolders.create(
        params.workspaceFolders || [{ uri: params.rootUri || '', name: '' }]
    );

    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability =
        !!capabilities.workspace && !!capabilities.workspace.configuration;

    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    // hasDiagnosticRelatedInformationCapability = !!(
    //     capabilities.textDocument &&
    //     capabilities.textDocument.publishDiagnostics &&
    //     capabilities.textDocument.publishDiagnostics.relatedInformation
    // );

    // config.setConfigurationCapability(hasConfigurationCapability);

    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: true,
            },
            codeLensProvider: {
                resolveProvider: true,
            },
            executeCommandProvider: {
                commands: [
                    'phpunit.lsp.load',
                    'phpunit.lsp.run-all',
                    'phpunit.lsp.rerun',
                    'phpunit.lsp.run-file',
                    'phpunit.lsp.run-test-at-cursor',
                    'phpunit.lsp.cancel',
                ],
            },
        },
    };
});

connection.onInitialized(async () => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(
            DidChangeConfigurationNotification.type,
            undefined
        );
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(async params => {
            connection.console.log('Workspace folder change event received.');

            workspaceFolders.create(params.added).delete(params.removed);

            await workspaceFolders.update(hasConfigurationCapability);
        });
    }
    await workspaceFolders.update(hasConfigurationCapability);
});

connection.onDidChangeConfiguration(async () => {
    await workspaceFolders.update(hasConfigurationCapability);
});

// Only keep settings for open documents
documents.onDidClose(() => {
    // connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(() => {});

connection.onDidChangeWatchedFiles(async params => {
    const changes = (await Promise.all(
        params.changes.map(
            async event =>
                await workspaceFolders.get(event.uri).detectChange(event)
        )
    )).filter(suite => !!suite);

    if (changes.length > 0) {
        await Promise.all(
            params.changes.map(event =>
                connection.sendDiagnostics({
                    uri: event.uri,
                    diagnostics: [],
                })
            )
        );

        await Promise.all(
            changes.map(suite =>
                workspaceFolders.get(suite!.workspaceFolder!).loadTest()
            )
        );
    }

    await Promise.all(workspaceFolders.all().map(folder => folder.retryTest()));
    // connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(() => {
    return snippets.all();
});

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem) => {
    return item;
});

connection.onCodeLens(async params => {
    const uri = params.textDocument.uri;

    const suite = await workspaceFolders.get(uri).detectChange({
        uri,
        type: FileChangeType.Changed,
    });

    return suite ? suite.exportCodeLens() : [];
});

connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
    const command = params.command;
    const args: string[] = params.arguments || [];
    const workspaceFolder = args.shift() || '';

    workspaceFolders.get(workspaceFolder).executeCommand({
        command,
        arguments: args,
    });
});

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
