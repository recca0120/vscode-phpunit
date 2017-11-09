import { Config, Project, Tester } from './tester';
import { DiagnosticCollection, ExtensionContext, OutputChannel, languages, window, workspace } from 'vscode';

import { DecorateManager } from './decorate-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { PHPUnit } from './phpunit';

export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!');

    const project: Project = {
        window: window,
        workspace: workspace,
        rootPath: workspace.rootPath,
        extensionPath: context.extensionPath,
        config: Object.assign(
            {
                execPath: '',
                args: [],
            },
            workspace.getConfiguration('phpunit')
        ),
    };

    const name = 'PHPUnit';
    const outputChannel: OutputChannel = window.createOutputChannel(name);
    const diagnostics: DiagnosticCollection = languages.createDiagnosticCollection(name);

    const phpunit: PHPUnit = new PHPUnit(project).on('stdout', (buffer: Buffer) =>
        outputChannel.append(buffer.toString())
    );
    const decorateManager = new DecorateManager(project);
    const diagnosticManager = new DiagnosticManager(diagnostics);
    const tester = new Tester(project, phpunit, decorateManager, diagnosticManager);

    context.subscriptions.push(tester.subscribe());
}

// this method is called when your extension is deactivated
export function deactivate() {}
