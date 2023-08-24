import { WorkspaceConfiguration } from 'vscode';
import { IConfiguration } from './phpunit';

export class Configuration implements IConfiguration {
    constructor(private workspaceConfiguration: WorkspaceConfiguration) {
    }

    updateWorkspaceConfiguration(workspaceConfiguration: WorkspaceConfiguration) {
        this.workspaceConfiguration = workspaceConfiguration;
    }

    get(key: string, defaultValue?: unknown): unknown | undefined {
        return this.workspaceConfiguration.get(key, defaultValue);
    }

    has(key: string): any {
        return this.workspaceConfiguration.has(key);
    }

    async update(key: string, value: any): Promise<void> {
        console.log(this.workspaceConfiguration);

        return this.workspaceConfiguration.update(key, value);
    }
}
