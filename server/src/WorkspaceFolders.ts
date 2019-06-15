import files from './Filesystem';
import URI from 'vscode-uri';
import { Configuration } from './Configuration';
import { PathLike } from 'fs';
import { PHPUnitOutput } from './ProblemMatcher';
import { TestEventCollection } from './TestEventCollection';
import { TestRunner } from './TestRunner';
import { TestSuiteCollection } from './TestSuiteCollection';
import { WorkspaceFolder } from './WorkspaceFolder';
import {
    WorkspaceFolder as _WorkspaceFolder,
    Connection,
} from 'vscode-languageserver';

export class WorkspaceFolders {
    private workspaceFolders: Map<string, WorkspaceFolder> = new Map();

    constructor(private connection: Connection, private _files = files) {}

    create(workspaceFolders: _WorkspaceFolder[]) {
        return workspaceFolders.map(folder => {
            const uri = this._files.asUri(folder.uri).toString();

            if (!this.workspaceFolders.has(uri)) {
                this.workspaceFolders.set(uri, this.createWorkspaceFolder(uri));
            }

            return this.workspaceFolders.get(uri);
        });
    }

    async update(configurationCapability = true) {
        return Promise.all(
            Array.from(this.workspaceFolders.values()).map(
                async workspaceFolder => {
                    await workspaceFolder
                        .getConfig()
                        .update(configurationCapability);
                }
            )
        );
    }

    get(uri: PathLike | URI): WorkspaceFolder {
        const _uri = this._files.asUri(uri).toString();

        const current = Array.from(this.workspaceFolders.keys())
            .sort((a, b) => b.length - a.length)
            .find(uri => _uri.indexOf(uri) !== -1);

        return this.workspaceFolders.get(current!)!;
    }

    private createWorkspaceFolder(uri: string) {
        const config = new Configuration(this.connection, uri);
        const suites = new TestSuiteCollection();
        const events = new TestEventCollection();
        const problemMatcher = new PHPUnitOutput(suites);
        const testRunner = new TestRunner();

        return new WorkspaceFolder(
            uri,
            this.connection,
            config,
            suites,
            events,
            testRunner,
            problemMatcher,
            this._files
        );
    }
}
