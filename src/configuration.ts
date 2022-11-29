import { IConfiguration } from './phpunit/configuration';
import { WorkspaceConfiguration } from 'vscode';

export class Configuration implements IConfiguration {
    constructor(private items: WorkspaceConfiguration) {}

    get(key: string, defaultValue?: unknown): unknown | undefined {
        return this.items.get(key, defaultValue);
    }

    has(key: string): any {
        return this.items.has(key);
    }

    async update(key: string, value: any): Promise<void> {
        return this.items.update(key, value);
    }
}
