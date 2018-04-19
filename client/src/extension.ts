/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import { CommandRegister } from './command-register';
import { DecorateManager } from './decorate-manage';
import { ExtensionContext, window, workspace } from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
    RevealOutputChannelOn,
} from 'vscode-languageclient';

export function activate(context: ExtensionContext) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    // The debug options for the server
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'php' }],
        synchronize: {
            // Synchronize the setting section 'languageServerExample' to the server
            configurationSection: 'phpunit',
            // Notify the server about file changes to '.clientrc files contain in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/*.php'),
        },
        outputChannel: window.createOutputChannel('PHPUnit'),
        revealOutputChannelOn: RevealOutputChannelOn.Error,
        diagnosticCollectionName: 'PHPUnit',
    };

    const client = new LanguageClient('phpunit', 'PHPUnit Language Server', serverOptions, clientOptions);
    const decorateManager: DecorateManager = new DecorateManager(client, context, window);
    const commandRegister: CommandRegister = new CommandRegister(client, window).register();

    client.onReady().then(() => {
        commandRegister.ready();
        decorateManager.listen();
    });

    // Create the language client and start the client.
    const disposable = client.start();

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
    context.subscriptions.push(commandRegister.dispose());
}
