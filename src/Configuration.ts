import type { WorkspaceConfiguration } from 'vscode';
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

    has(key: string): boolean {
        const inspected = this.workspaceConfiguration.inspect(key);
        return (
            inspected?.workspaceFolderValue !== undefined ||
            inspected?.workspaceValue !== undefined ||
            inspected?.globalValue !== undefined
        );
    }

    async update(key: string, value: unknown): Promise<void> {
        return this.workspaceConfiguration.update(key, value);
    }
}
