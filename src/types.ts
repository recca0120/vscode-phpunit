import type { Container } from 'inversify';
import type { Position, TestItem, TestRunProfileKind, TestRunRequest, Uri, WorkspaceFolder } from 'vscode';
import type { ProcessBuilder } from './PHPUnit';

export type ChildContainerFactory = (folder: WorkspaceFolder) => Container;
export type ProcessBuilderFactory = (profileKind?: TestRunProfileKind) => Promise<ProcessBuilder>;

export interface FolderTestContext {
    reloadAll(): Promise<void>;
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
    ProcessBuilderFactory: Symbol.for('ProcessBuilderFactory'),
};
