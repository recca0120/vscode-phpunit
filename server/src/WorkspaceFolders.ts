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
        workspaceFolders.forEach(_workspaceFolder => {
            const uri = this._files.asUri(_workspaceFolder.uri).toString();

            if (this.workspaceFolders.has(uri)) {
                return;
            }

            const config = new Configuration(this.connection);
            const suites = new TestSuiteCollection();
            const events = new TestEventCollection();
            const problemMatcher = new PHPUnitOutput(suites);
            const testRunner = new TestRunner();

            this.workspaceFolders.set(
                uri,
                new WorkspaceFolder(
                    uri,
                    this.connection,
                    config,
                    suites,
                    events,
                    problemMatcher,
                    testRunner,
                    this._files
                )
            );
        });

        return this;
    }

    get(uri: PathLike | URI): WorkspaceFolder {
        const _uri = this._files.asUri(uri).toString();
        const current = Array.from(this.workspaceFolders.keys()).find(
            uri => _uri.indexOf(uri) !== -1
        ) as string;

        return this.workspaceFolders.get(current)!;
    }
}
