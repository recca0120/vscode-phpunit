/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
    createConnection,
    TextDocuments,
    TextDocument,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CodeLensParams,
    ExecuteCommandParams,
    Position,
    WillSaveTextDocumentNotification,
    MessageType,
    LogMessageNotification,
    DiagnosticRelatedInformation,
} from 'vscode-languageserver';
import Parser, { TestSuiteInfo, AsCodeLens } from './Parser';
import { TestRunner } from './TestRunner';
import { ProblemMatcher, Problem } from './ProblemMatcher';

const parser = new Parser();
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

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
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            // Tell the client that the server supports code completion
            // completionProvider: {
            //     resolveProvider: true,
            // },
            codeLensProvider: {
                resolveProvider: true,
            },
            executeCommandProvider: {
                commands: [
                    'phpunit.lsp.run-all',
                    'phpunit.lsp.rerun',
                    'phpunit.lsp.run-directory',
                    'phpunit.lsp.run-file',
                    'phpunit.lsp.run-test-at-cursor',
                ],
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
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            // connection.console.log('Workspace folder change event received.');
        });
    }
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
const defaultSettings: Settings = {
    maxNumberOfProblems: 1000,
    php: '',
    phpunit: '',
    args: [],
};
let globalSettings: Settings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<Settings>> = new Map();

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = <Settings>(change.settings.phpunit || defaultSettings);
    }

    // Revalidate all open text documents
    // documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<Settings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'phpunit',
        });
        documentSettings.set(resource, result);
    }
    return result;
}

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

connection.onDidChangeWatchedFiles(_change => {
    // Monitored files have change in VSCode
    // connection.console.log(JSON.stringify(_change));
    // connection.console.log('We received an file change event');
});

connection.onCodeLens((params: CodeLensParams) => {
    const testsuite: TestSuiteInfo = parser.parseTextDocument(
        documents.get(params.textDocument.uri)
    );

    if (!testsuite) {
        return [];
    }

    return [testsuite as AsCodeLens]
        .concat(testsuite.children as AsCodeLens[])
        .map(test => test.asCodeLens());
});

const runner = new TestRunner();
connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
    const args = params.arguments;
    const textDocument: TextDocument = documents.get(args[0]);
    const position: Position = args[1];

    const settings = await getDocumentSettings(textDocument.uri);

    try {
        connection.sendNotification(WillSaveTextDocumentNotification.type, {});
        connection.sendNotification('started', () => {});

        if (textDocument) {
            connection.sendDiagnostics({
                uri: textDocument.uri,
                diagnostics: [],
            });
        }

        runner
            .setPhpBinary(settings.php)
            .setPhpUnitBinary(settings.phpunit)
            .setArgs(settings.args);

        const response = await runner.run(
            params.command,
            textDocument,
            position
        );

        connection.sendNotification(LogMessageNotification.type, {
            type: MessageType.Log,
            message: response,
        });

        const problemMatcher = new ProblemMatcher();
        const problems = await problemMatcher.parse(response);

        problems
            .reduce(
                (
                    diagnosticGroup: Map<string, Diagnostic[]>,
                    problem: Problem
                ) => {
                    const diagnostics = diagnosticGroup.has(problem.uri)
                        ? diagnosticGroup.get(problem.uri)
                        : [];

                    const diagnostic: Diagnostic = {
                        severity: DiagnosticSeverity.Error,
                        range: problem.range,
                        message: problem.message.trim(),
                        source: 'PHPUnit',
                    };

                    if (hasDiagnosticRelatedInformationCapability) {
                        diagnostic.relatedInformation = problem.files.map(
                            file => {
                                return DiagnosticRelatedInformation.create(
                                    file,
                                    problem.message.trim()
                                );
                            }
                        );
                    }

                    diagnosticGroup.set(
                        problem.uri,
                        diagnostics.concat([diagnostic])
                    );

                    return diagnosticGroup;
                },
                new Map<string, Diagnostic[]>()
            )
            .forEach((diagnostics: Diagnostic[], uri: string) => {
                connection.sendDiagnostics({
                    uri,
                    diagnostics,
                });
            });
    } catch (e) {
        throw e;
    } finally {
        connection.sendNotification('finished');
    }
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
