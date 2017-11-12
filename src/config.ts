class FakeWorkspaceConfiguration {
    constructor(public name) {}

    get(): any {
        return 'fake';
    }

    update() {
        return true;
    }

    has() {
        return true;
    }
}

class FakeWorkspace {
    public rootPath: string = __dirname;

    getConfiguration(name: string) {
        return new FakeWorkspaceConfiguration(name);
    }
}

export class ConfigRepository {
    constructor(private workspace = new FakeWorkspace()) {}

    private getWorkspaceConfigure(): any {
        return this.workspace.getConfiguration('phpunit');
    }

    get(key: string, defaultValue?: any): any {
        return this.getWorkspaceConfigure().get(key, defaultValue);
    }

    put(key: string, value: any): ConfigRepository {
        this.getWorkspaceConfigure().update(key, value);

        return this;
    }

    has(key: string): boolean {
        return this.getWorkspaceConfigure().has(key);
    }
}
