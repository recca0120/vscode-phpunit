import { WorkspaceConfiguration } from 'vscode';
import { BaseConfiguration } from './PHPUnit';

export class Configuration extends BaseConfiguration {
    constructor(private workspaceConfiguration: WorkspaceConfiguration) {
        super();
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
        return this.workspaceConfiguration.update(key, value);
    }
}
