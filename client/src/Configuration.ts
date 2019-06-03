import { workspace } from 'vscode';

export class Configuration {
    constructor(private _workspace = workspace) {}

    get clearOutputOnRun() {
        return this.get('clearOutputOnRun', true);
    }

    get(property: string, defaultValue?: any) {
        return this._workspace
            .getConfiguration('phpunit')
            .get(property, defaultValue);
    }
}
