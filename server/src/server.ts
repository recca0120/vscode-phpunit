import { Controller } from './Controller';
import { Snippets } from './snippets';
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
const suites = new TestSuiteCollection();
const events = new TestEventCollection();
const runner = new TestRunner();
const controller = new Controller(connection, suites, events, runner);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    // hasDiagnosticRelatedInformationCapability = !!(
    //     capabilities.textDocument &&
    //     capabilities.textDocument.publishDiagnostics &&
    //     capabilities.textDocument.publishDiagnostics.relatedInformation
    // );

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

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(
            DidChangeConfigurationNotification.type,
            undefined
        );
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(async () => {
            // await suites.load();
            // connection.console.log('Workspace folder change event received.');
        });
    }

    // await suites.load();
});

// The example settings
interface Settings {
    maxNumberOfProblems: number;
    php: string;
    phpunit: string;
    args: string[];
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
// const defaultSettings: Settings = {
//     maxNumberOfProblems: 1000,
//     php: '',
//     phpunit: '',
//     args: [],
// };
// let globalSettings: Settings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<Settings>> = new Map();

// connection.onDidChangeConfiguration(change => {
//     if (hasConfigurationCapability) {
//         // Reset all cached document settings
//         documentSettings.clear();
//     } else {
//         globalSettings = <Settings>(change.settings.phpunit || defaultSettings);
//     }

//     // Revalidate all open text documents
//     // documents.all().forEach(validateTextDocument);
// });

// function getDocumentSettings(resource: string): Thenable<Settings> {
//     if (!hasConfigurationCapability) {
//         return Promise.resolve(globalSettings);
//     }
//     let result = documentSettings.get(resource);
//     if (!result) {
//         result = connection.workspace.getConfiguration({
//             scopeUri: resource,
//             section: 'phpunit',
//         });
//         documentSettings.set(resource, result);
//     }
//     return result;
// }

// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
    // connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(() => {
    // validateTextDocument(change.document);
});

connection.onDidChangeWatchedFiles(async _change => {
    // Monitored files have change in VSCode
    await Promise.all(_change.changes.map(event => suites.put(event.uri)));
    connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
    (): CompletionItem[] => {
        return snippets.all();
    }
);

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        return item;
    }
);

connection.onCodeLens(() => {
    return [];
});
// connection.onCodeLens(async (params: CodeLensParams) => {
//     suites.putTextDocument(documents.get(params.textDocument.uri));
//     const suite: TestSuite = await suites.get(params.textDocument.uri);

//     return !suite ? [] : suite.exportCodeLens();
// });

connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
    controller.executeCommand(params);
    // const args = params.arguments;
    // const textDocument: TextDocument = documents.get(args[0]);
    // const position: Position = args[1];
    // const settings = await getDocumentSettings(textDocument.uri);
    // suites.all().forEach((...args) => {
    //     connection.sendDiagnostics({
    //         uri: args[1] as string,
    //         diagnostics: [],
    //     });
    // });
    // try {
    //     if (textDocument) {
    //         connection.sendRequest(WillSaveTextDocumentWaitUntilRequest.type, {
    //             textDocument,
    //             reason: TextDocumentSaveReason.Manual,
    //         });
    //     }
    //     connection.sendNotification('started', () => {});
    //     runner
    //         .setPhpBinary(settings.php)
    //         .setPhpUnitBinary(settings.phpunit)
    //         .setArgs(settings.args);
    //     const response = await runner.run({
    //         method: params.command,
    //         textDocument,
    //         position,
    //     });
    //     if (!response) {
    //         return;
    //     }
    //     (await response.asDiagnosticGroup(
    //         hasDiagnosticRelatedInformationCapability
    //     )).forEach((diagnostics, uri) => {
    //         connection.sendDiagnostics({
    //             uri,
    //             diagnostics,
    //         });
    //     });
    //     connection.sendNotification(LogMessageNotification.type, {
    //         type: MessageType.Log,
    //         message: response.toString(),
    //     });
    // } catch (e) {
    //     throw e;
    // } finally {
    //     connection.sendNotification('finished');
    // }
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
