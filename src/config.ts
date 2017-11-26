export class ConfigRepository {
    constructor(private workspace: any) {}

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
