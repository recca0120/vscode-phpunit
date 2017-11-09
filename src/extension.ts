import { DiagnosticCollection, ExtensionContext, OutputChannel, languages, window, workspace } from 'vscode';
import { Project, Tester } from './tester';

import { DecorateManager } from './decorate-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { PHPUnit } from './phpunit';

export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!');

    const name = 'PHPUnit';
    const project: Project = new Project(window, workspace, context.extensionPath);
    const outputChannel: OutputChannel = window.createOutputChannel(name);
    const diagnostics: DiagnosticCollection = languages.createDiagnosticCollection(name);

    const phpunit: PHPUnit = new PHPUnit().on('stdout', (buffer: Buffer) => outputChannel.append(buffer.toString()));
    const decorateManager = new DecorateManager(project);
    const diagnosticManager = new DiagnosticManager(diagnostics);
    const tester = new Tester(project, phpunit, decorateManager, diagnosticManager);

    context.subscriptions.push(tester.subscribe());
}

// this method is called when your extension is deactivated
export function deactivate() {}
