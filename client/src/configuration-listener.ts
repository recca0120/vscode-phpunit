import { LanguageClient, DidChangeConfigurationNotification } from 'vscode-languageclient';
import { window as win, workspace as wkspace, TextEditor, Uri, Disposable } from 'vscode';

export class ConfigurationListener {
    private disposables: Disposable[] = [];

    constructor(private client: LanguageClient, private window = win, private workspace = wkspace) {}

    listen(): void {
        this.disposables.push(this.window.onDidChangeActiveTextEditor(this.computeConfiguration.bind(this)));
        this.computeConfiguration();
    }

    computeConfiguration(): void {
        if (!this.window.activeTextEditor) {
            return;
        }

        const settings: any = this.getConfiguration(this.window.activeTextEditor);

        if (!settings) {
            return;
        }

        this.client.sendNotification(DidChangeConfigurationNotification.type, settings);
    }

    dispose(): Disposable[] {
        return this.disposables;
    }

    private getConfiguration(editor: TextEditor): any | undefined {
        const resource: Uri = editor.document.uri;

        if (resource.scheme !== 'file') {
            return;
        }

        const workspaceFolder = this.workspace.getWorkspaceFolder(resource);

        return {
            settings: {
                phpunit: workspaceFolder
                    ? this.workspace.getConfiguration('phpunit', resource)
                    : this.workspace.getConfiguration('phpunit'),
            },
        };
    }
}
