import {
    DiagnosticCollection,
    ExtensionContext,
    OutputChannel,
    StatusBarAlignment,
    commands,
    languages,
    window,
    workspace,
} from 'vscode';

import { ConfigRepository } from './config';
import { DecorateManager } from './decorate-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { PHPUnit } from './command/phpunit';
import { StatusBar } from './status-bar';
import { TestRunner } from './test-runner';
import { container } from './container';
import { tap } from './helpers';

export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!');

    container
        .set('config', new ConfigRepository(workspace))
        .set('window', window)
        .set('workspace', workspace)
        .set('context', context)
        .set('extensionPath', context.extensionPath);

    const channel: OutputChannel = window.createOutputChannel(container.name);
    const diagnostics: DiagnosticCollection = languages.createDiagnosticCollection(container.name);
    const decorateManager = new DecorateManager(container);
    const diagnosticManager = new DiagnosticManager(diagnostics);
    const command: PHPUnit = tap(
        new PHPUnit(container.parserFactory, container.processFactory, container.files),
        command =>
            command
                .on('start', () => channel.clear())
                .on('start', (buffer: Buffer) => channel.append(buffer.toString()))
                .on('stdout', (buffer: Buffer) => channel.append(buffer.toString()))
                .on('exit', () => channel.append('\n\n'))
    );

    const statusBar = new StatusBar(window.createStatusBarItem(StatusBarAlignment.Right, 100), container);

    const testRunner = new TestRunner({
        container,
        command,
        statusBar,
        decorateManager,
        diagnosticManager,
    });

    context.subscriptions.push(testRunner.subscribe(commands));

    return testRunner;
}

// this method is called when your extension is deactivated
export function deactivate() {}
