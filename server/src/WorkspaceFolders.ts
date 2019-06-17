import files from './Filesystem';
import Parser from './Parser';
import URI from 'vscode-uri';
import { Configuration } from './Configuration';
import { OutputProblemMatcher } from './OutputProblemMatcher';
import { PathLike } from 'fs';
import { ProblemCollection } from './ProblemCollection';
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
        workspaceFolders.map(folder => {
            if (!this.workspaceFolders.has(folder.uri)) {
                this.workspaceFolders.set(
                    folder.uri,
                    this.createWorkspaceFolder(folder)
                );
            }

            return this.workspaceFolders.get(folder.uri);
        });

        return this;
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

    all() {
        return Array.from(this.workspaceFolders.values());
    }

    delete(workspaceFolders: _WorkspaceFolder[]) {
        workspaceFolders.forEach(folder =>
            this.workspaceFolders.delete(folder.uri)
        );

        return this;
    }

    private createWorkspaceFolder(workspaceFolder: _WorkspaceFolder) {
        const config = new Configuration(this.connection, workspaceFolder);
        const suites = new TestSuiteCollection(new Parser(workspaceFolder));
        const events = new TestEventCollection();
        const problems = new ProblemCollection();
        const problemMatcher = new OutputProblemMatcher(suites);
        const testRunner = new TestRunner();

        return new WorkspaceFolder(
            workspaceFolder,
            this.connection,
            config,
            suites,
            events,
            problems,
            problemMatcher,
            testRunner,
            this._files
        );
    }
}
