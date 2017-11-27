export class ConfigRepository {
    constructor(private workspace: any) {}

    private getWorkspaceConfigure(namespace = 'phpunit'): any {
        return this.workspace.getConfiguration(namespace);
    }

    get(key: string, defaultValue?: any, namespace = 'phpunit'): any {
        return this.getWorkspaceConfigure(namespace).get(key, defaultValue);
    }

    put(key: string, value: any, namespace = 'phpunit'): ConfigRepository {
        this.getWorkspaceConfigure(namespace).update(key, value);

        return this;
    }

    has(key: string, namespace = 'phpunit'): boolean {
        return this.getWorkspaceConfigure(namespace).has(key);
    }
}
