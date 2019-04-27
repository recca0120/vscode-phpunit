/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { window, workspace, commands, ExtensionContext } from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
    WillSaveTextDocumentNotification,
} from 'vscode-languageclient';
import { CommandRegister } from './CommandRegister';
import { SocketOutputChannel } from './SocketOutputChannel';
import { Notify } from './Notify';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
    const outputChannel: SocketOutputChannel = new SocketOutputChannel(
        window.createOutputChannel('PHPUnit Language Server'),
        workspace.getConfiguration('phpunit').get('port', 7000)
    );

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

    const commandRegister = new CommandRegister(client, commands);
    context.subscriptions.push(commandRegister.registerRunSuite());
    context.subscriptions.push(commandRegister.registerRunDirectory());
    context.subscriptions.push(commandRegister.registerRunFile());
    context.subscriptions.push(commandRegister.registerRunNearest());
    context.subscriptions.push(commandRegister.registerRunLast());
    context.subscriptions.push(
        commandRegister.registerStartStraming(outputChannel)
    );

    client.onReady().then(() => {
        client.onNotification(WillSaveTextDocumentNotification.type, () => {
            if (window.activeTextEditor && window.activeTextEditor.document) {
                outputChannel.clear();
                outputChannel.show(true);
                window.activeTextEditor.document.save();
            }
        });

        const notify = new Notify(window);
        client.onNotification('before', () => {
            notify.show('PHPUnit Running...');
        });

        client.onNotification('after', () => {
            notify.hide();
        });
    });

    // Start the client. This will also launch the server
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
