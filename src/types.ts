import type { Container } from 'inversify';
import type { Position, TestItem, TestRunRequest, Uri, WorkspaceFolder } from 'vscode';

export type ChildContainerFactory = (folder: WorkspaceFolder) => Container;

export interface FolderTestContext {
    findTestsByFile(uri: Uri): TestItem[];
    findTestsByPosition(uri: Uri, position: Position): TestItem[];
    findTestsByRequest(request?: TestRunRequest): TestItem[] | undefined;
    getPreviousRequest(): TestRunRequest | undefined;
    getLastRunAt(): number;
}

export const TYPES = {
    TestController: Symbol.for('TestController'),
    OutputChannel: Symbol.for('OutputChannel'),
    FileChangedEmitter: Symbol.for('FileChangedEmitter'),
    WorkspaceFolder: Symbol.for('WorkspaceFolder'),
    ChildContainerFactory: Symbol.for('ChildContainerFactory'),
};
