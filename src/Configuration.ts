import type { WorkspaceConfiguration } from 'vscode';
import { BaseConfiguration, BinaryDetector } from './PHPUnit';

export class Configuration extends BaseConfiguration {
    constructor(
        private workspaceConfiguration: WorkspaceConfiguration,
        binaryDetector: BinaryDetector = new BinaryDetector(),
    ) {
        super();
        this.binaryDetector = binaryDetector;
    }

    updateWorkspaceConfiguration(workspaceConfiguration: WorkspaceConfiguration) {
        this.workspaceConfiguration = workspaceConfiguration;
    }

    resolve(key: string, defaultValue?: unknown): unknown | undefined {
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
