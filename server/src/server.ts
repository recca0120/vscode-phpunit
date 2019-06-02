import { Configuration } from './Configuration';
import { Controller } from './Controller';
import { Snippets } from './Snippets';
import { TestEventCollection } from './TestEventCollection';
import { TestRunner } from './TestRunner';
import { TestSuiteCollection } from './TestSuiteCollection';
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
    CompletionItem,
} from 'vscode-languageserver';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

const snippets = new Snippets();

const config = new Configuration(connection);
const suites = new TestSuiteCollection();
const events = new TestEventCollection();
const runner = new TestRunner();
const controller = new Controller(connection, config, suites, events, runner);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
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

    config.setConfigurationCapability(hasConfigurationCapability);

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
                commands: controller.commands,
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
        connection.workspace.onDidChangeWorkspaceFolders(async () => {
            connection.console.log('Workspace folder change event received.');
            await config.update();
        });
    }

    await config.update();
});

connection.onDidChangeConfiguration(async () => {
    await config.update();
});

// Only keep settings for open documents
documents.onDidClose(() => {
    // connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(() => {});

connection.onDidChangeWatchedFiles(change => {
    controller.detectChanges(change);
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
    const document = documents.get(params.textDocument.uri);

    return document ? await controller.detectChanges(document) : [];
});

connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
    controller.executeCommand(params);
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
