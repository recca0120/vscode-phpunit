/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import {
    window,
    workspace,
    commands,
    ExtensionContext,
    OutputChannel,
} from 'vscode';
import * as WebSocket from 'ws';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from 'vscode-languageclient';

let client: LanguageClient;

class SocketOutputChannel implements OutputChannel {
    private log: string = '';

    private socket?: WebSocket;

    readonly name: string = '';

    constructor(
        private outputChannel: OutputChannel,
        private socketPort = 7000
    ) {
        this.name = outputChannel.name;
    }

    listen(): this {
        this.socket =
            this.socket || new WebSocket(`ws://localhost:${this.socketPort}`);

        return this;
    }

    setSocket(socket: WebSocket) {
        this.socket = socket;
    }

    append(value: string): void {
        this.log += value;

        return this.outputChannel.append(value);
    }

    appendLine(value: string): void {
        this.log += value;
        // Don't send logs until WebSocket initialization
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(this.log);
        }
        this.log = '';

        return this.outputChannel.appendLine(value);
    }

    clear(): void {
        return this.outputChannel.clear();
    }

    show(...args: any[]): void {
        return this.outputChannel.show(...args);
    }

    hide(): void {
        return this.outputChannel.hide();
    }

    dispose(): void {
        return this.outputChannel.dispose();
    }
}

export function activate(context: ExtensionContext) {
    const outputChannel: SocketOutputChannel = new SocketOutputChannel(
        window.createOutputChannel('Language Server PHPUnit'),
        workspace.getConfiguration('languageServerPHPUnit').get('port', 7000)
    );

    commands.registerCommand('languageServerPHPUnit.startStreaming', () => {
        // Establish websocket connection
        outputChannel.listen();
    });

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
        'languageServerPHPUnit',
        'Language Server PHPUnit',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
