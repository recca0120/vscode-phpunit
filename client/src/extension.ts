import { Configuration } from './Configuration';
import * as path from 'path';
import {
    ExtensionContext,
    window,
    workspace,
    extensions,
    commands,
} from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
    // WillSaveTextDocumentWaitUntilRequest,
} from 'vscode-languageclient';
import { TestHub, testExplorerExtensionId } from 'vscode-test-adapter-api';
import { TestAdapterRegistrar, Log } from 'vscode-test-adapter-util';
import { LanguageClientAdapter } from './LanguageClientAdapter';
import { LanguageClientController } from './LanguageClientController';
// import { SocketOutputChannel } from './SocketOutputChannel';
// import { Notify } from './Notify';

let client: LanguageClient;
export function activate(context: ExtensionContext) {
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
        middleware: {
            provideCodeLenses: () => {
                return null;
            },
        },
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'phpunit',
        'PHPUnit Language Server',
        serverOptions,
        clientOptions
    );

    const config = new Configuration(workspace);
    const controller = new LanguageClientController(
        client,
        config,
        outputChannel,
        commands
    );

    context.subscriptions.push(controller.init());

    const workspaceFolder = (workspace.workspaceFolders || [])[0];
    const log = new Log('phpunit', workspaceFolder, 'PHPUnit Test Explorer');
    context.subscriptions.push(log);

    const testExplorerExtension = extensions.getExtension<TestHub>(
        testExplorerExtensionId
    );

    if (testExplorerExtension) {
        const testHub = testExplorerExtension.exports;

        // this will register an ExampleTestAdapter for each WorkspaceFolder
        context.subscriptions.push(
            new TestAdapterRegistrar(
                testHub,
                workspaceFolder =>
                    new LanguageClientAdapter(workspaceFolder, client, log),
                log
            )
        );
    }

    // Start the client. This will also launch the server
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }

    return client.stop();
}
