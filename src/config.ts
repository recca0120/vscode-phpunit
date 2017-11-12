import { WorkspaceConfiguration } from 'vscode';

export class Fake implements WorkspaceConfiguration {
    readonly [key: string]: any;
    get<T>(): T;
    get<T>(): T;
    get() {
        throw new Error('Method not implemented.');
    }
    has(): boolean {
        throw new Error('Method not implemented.');
    }
    inspect<T>(): { key: string; defaultValue?: T; globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T } {
        throw new Error('Method not implemented.');
    }
    update(): Thenable<void> {
        throw new Error('Method not implemented.');
    }
}

export class ConfigRepository {
    constructor(private workspaceConfigure: WorkspaceConfiguration = new Fake()) {}

    get(key: string): any {
        return this.workspaceConfigure.get(key);
    }

    put(key: string, value: any): ConfigRepository {
        this.workspaceConfigure.update(key, value);

        return this;
    }

    has(key: string): boolean {
        return this.workspaceConfigure.has(key);
    }
}
