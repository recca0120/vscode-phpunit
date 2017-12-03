import { ExtensionContext, TextEditor } from 'vscode';

import { ConfigRepository } from './config';
import { Store } from './store';
import { Validator } from './validator';

const store = new Store();
const validator = new Validator();

interface Singleton {
    [key: string]: any;
    store: Store;
    validator: Validator;
    config?: ConfigRepository;
    window?: any;
    workspace?: any;
    context?: ExtensionContext;
    extensionPath: string;
}

export class Container {
    public name: string = 'PHPUnit';

    protected singleton: Singleton = {
        store,
        validator,
        workspace: {
            rootPath: __dirname,
        },
        extensionPath: __dirname,
    };

    basePath(editor: TextEditor = this.window.activeTextEditor, workspace: any = this.workspace): string {
        return this.workspaceFolder(workspace, editor);
    }

    workspaceFolder(workspace: any, editor: TextEditor) {
        if (!editor || !workspace.workspaceFolders || workspace.workspaceFolders.length < 2) {
            return workspace.rootPath;
        }
        const resource = editor.document.uri;
        const folder = workspace.getWorkspaceFolder(resource);

        return !folder ? workspace.rootPath : folder.uri.fsPath;
    }

    get extensionPath(): string {
        return this.getSingleton('extensionPath');
    }

    get window(): any {
        return this.getSingleton('window');
    }

    get workspace(): any {
        return this.getSingleton('workspace');
    }

    get config(): ConfigRepository {
        return this.getSingleton('config');
    }

    get context(): ExtensionContext {
        return this.getSingleton('context');
    }

    get store(): Store {
        return this.getSingleton('store');
    }

    get validator(): Validator {
        return this.getSingleton('validator');
    }

    get(key: string): any {
        return this.getSingleton(key);
    }

    set(key: string, object: any): Container {
        return this.setSingleton(key, object);
    }

    protected getSingleton(key: string): any {
        return this.singleton[key];
    }

    protected setSingleton(key: string, object: any): Container {
        this.singleton[key] = object;

        return this;
    }
}

export const container: Container = new Container();
