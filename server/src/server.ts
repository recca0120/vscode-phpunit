/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
    createConnection,
    TextDocuments,
    TextDocument,
    Diagnostic,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CodeLensParams,
    CodeLens,
    ExecuteCommandParams,
    DocumentSymbolParams,
    SymbolInformation,
} from 'vscode-languageserver';
import { TestRunner } from './phpunit/test-runner';
import { CodeLensProvider } from './codelens-provider';
import { CommandProvider } from './command-provider';
import { DiagnosticProvider } from './diagnostic-provider';
import { TestResults } from './phpunit/test-results';
import { DocumentSymbolProvider } from './document-symbol-provider';
import { Snippets } from './snippets';

const testRunner = new TestRunner();
const snippets: Snippets = new Snippets();
const commandProvider: CommandProvider = new CommandProvider();
const codelensProvider: CodeLensProvider = new CodeLensProvider();
const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider();
const documentSymbolProvider: DocumentSymbolProvider = new DocumentSymbolProvider();

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;
    hasWorkspaceFolderCapability = capabilities.workspace && !!capabilities.workspace.workspaceFolders;
    // hasDiagnosticRelatedInformationCapability =
    //     capabilities.textDocument &&
    //     capabilities.textDocument.publishDiagnostics &&
    //     capabilities.textDocument.publishDiagnostics.relatedInformation;

    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            // Tell the client that the server supports code completion
            completionProvider: {
                resolveProvider: true,
            },
            codeLensProvider: {
                resolveProvider: true,
            },
            documentSymbolProvider: true,
            executeCommandProvider: {
                commands: commandProvider.commands,
            },
        },
    };
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// The example settings
interface PHPUnitSettings {
    execPath: string;
    args: string[];
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: PHPUnitSettings = {
    execPath: '',
    args: [],
};
let globalSettings: PHPUnitSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<PHPUnitSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = <PHPUnitSettings>(change.settings.phpunit || defaultSettings);
    }
});

function getDocumentSettings(resource: string): Thenable<PHPUnitSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({ scopeUri: resource, section: 'phpunit' });
        documentSettings.set(resource, result);
    }
    return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
// documents.onDidChangeContent(change => {
// });

connection.onDidChangeWatchedFiles(_change => {
    // Monitored files have change in VSCode
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

connection.onCodeLens(
    (params: CodeLensParams): CodeLens[] => {
        const textDocument: TextDocument = documents.get(params.textDocument.uri);

        return codelensProvider.formText(textDocument.getText(), textDocument.uri);
    }
);

connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
    const { uri, args } = params.arguments[0];

    const settings: PHPUnitSettings = await getDocumentSettings(uri);
    testRunner.setBinary(settings.execPath).setDefaults(settings.args);

    const testResults: TestResults = await testRunner.handle(uri, args);
    const diagnosticGroup: Map<string, Diagnostic[]> = await diagnosticProvider.asDiagnosticGroup(
        testResults.getTests()
    );

    diagnosticGroup.forEach((diagnostics: Diagnostic[], uri: string) => {
        connection.sendDiagnostics({
            uri,
            diagnostics,
        });
    });

    connection.console.info(testResults.toString());
});

connection.onDocumentSymbol(
    async (params: DocumentSymbolParams): Promise<SymbolInformation[]> => {
        const textDocument: TextDocument = documents.get(params.textDocument.uri);

        return documentSymbolProvider.formText(textDocument.getText(), textDocument.uri);
    }
);

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
