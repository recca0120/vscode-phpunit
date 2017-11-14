import { DiagnosticCollection, ExtensionContext, OutputChannel, commands, languages, window, workspace } from 'vscode';

import { ConfigRepository } from './config';
import { DecorateManager } from './decorate-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { PHPUnit } from './command/phpunit';
import { TestRunner } from './test-runner';
import { container } from './container';

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

    const outputChannel: OutputChannel = window.createOutputChannel(container.name);
    const diagnostics: DiagnosticCollection = languages.createDiagnosticCollection(container.name);
    const decorateManager = new DecorateManager(container);
    const diagnosticManager = new DiagnosticManager(diagnostics);
    const phpunit: PHPUnit = new PHPUnit(container.parserFactory, container.processFactory, container.files);
    const testRunner = new TestRunner(container, phpunit, decorateManager, diagnosticManager);

    phpunit.on('before', () => outputChannel.clear());
    phpunit.on('stdout', (buffer: Buffer) => outputChannel.append(buffer.toString()));

    context.subscriptions.push(testRunner.subscribe(commands));

    return testRunner;
}

// this method is called when your extension is deactivated
export function deactivate() {}
