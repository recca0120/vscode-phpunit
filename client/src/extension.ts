/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { TestHub, testExplorerExtensionId } from 'vscode-test-adapter-api';
import {
    window,
    workspace,
    commands,
    ExtensionContext,
    extensions,
} from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
    WillSaveTextDocumentWaitUntilRequest,
} from 'vscode-languageclient';
import { CommandRequest } from './CommandRequest';
// import { SocketOutputChannel } from './SocketOutputChannel';
import { Notify } from './Notify';
import { PHPUnitController } from './PHPUnitController';

let client: LanguageClient;
let testHub: TestHub | undefined;
let controller: PHPUnitController | undefined;

export function activate(context: ExtensionContext) {
    const testExplorerExtension = extensions.getExtension<TestHub>(
        testExplorerExtensionId
    );

    if (testExplorerExtension) {
        testHub = testExplorerExtension.exports;
        controller = new PHPUnitController();
        testHub.registerTestController(controller);
    }

    const outputChannel = window.createOutputChannel('PHPUnit Language Server');

    // The server is implemented in node
    let serverModule = context.asAbsolutePath(
        path.join('server', 'out', 'server.js')
    );
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions,
        },
    };

    // Options to control the language client
    let clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'php' }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/*.php'),
        },
        // Hijacks all LSP logs and redirect them to a specific port through WebSocket connection
        // outputChannel: websocketOutputChannel,
        outputChannel,
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'phpunit',
        'PHPUnit Language Server',
        serverOptions,
        clientOptions
    );

    const commandRequest = new CommandRequest(client, commands);
    context.subscriptions.push(commandRequest.runAll());
    context.subscriptions.push(commandRequest.rerun());
    context.subscriptions.push(commandRequest.runFile());
    context.subscriptions.push(commandRequest.runTestAtCursor());
    context.subscriptions.push(commandRequest.runDirectory());
    context.subscriptions.push(commandRequest.cancel());

    client.onReady().then(() => {
        client.onRequest(WillSaveTextDocumentWaitUntilRequest.type, () => {
            if (!window.activeTextEditor || !window.activeTextEditor.document) {
                return;
            }
            window.activeTextEditor.document.save();

            return null;
        });

        const notify = new Notify(window);

        client.onNotification('started', () => {
            const clearOutpuOnRun = workspace
                .getConfiguration('phpunit')
                .get('clearOutputOnRun', true);

            if (clearOutpuOnRun) {
                outputChannel.clear();
            }

            outputChannel.show(true);
            notify.show('PHPUnit Running...');
        });

        client.onNotification('finished', () => {
            notify.hide();
        });
    });

    // Start the client. This will also launch the server
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (testHub && controller) {
        testHub.unregisterTestController(controller);
    }

    if (!client) {
        return undefined;
    }

    return client.stop();
}
