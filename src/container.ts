import { Container } from 'inversify';
import {
    EventEmitter,
    type OutputChannel,
    type TestController,
    type Uri,
    type WorkspaceFolder,
    workspace,
} from 'vscode';

import { Configuration } from './Configuration';
import { TestRunnerObserverFactory } from './Observers';
import { ChainAstParser, PHPUnitXML, TestParser } from './PHPUnit';
import { CloverParser, CoverageReader } from './PHPUnit/Coverage';
import type { Path } from './PHPUnit/PathReplacer';
import { PathReplacer } from './PHPUnit/PathReplacer';
import { ClassHierarchy } from './PHPUnit/TestParser/ClassHierarchy';
import { PhpParserAstParser } from './PHPUnit/TestParser/php-parser/PhpParserAstParser';
import { TreeSitterAstParser } from './PHPUnit/TestParser/tree-sitter/TreeSitterAstParser';
import { TestCollection } from './TestCollection';
import { TestFileDiscovery, TestFileWatcher, TestWatchManager } from './TestDiscovery';
import {
    DebugSessionManager,
    ProcessBuilderFactory,
    TestQueueBuilder,
    TestRunDispatcher,
    TestRunHandler,
    TestRunnerBuilder,
} from './TestExecution';
import { TYPES } from './types';
import { WorkspaceFolderManager } from './WorkspaceFolderManager';

export function createParentContainer(
    ctrl: TestController,
    outputChannel: OutputChannel,
): Container {
    const container = new Container();

    // VS Code external objects (shared)
    container.bind(TYPES.TestController).toConstantValue(ctrl);
    container.bind(TYPES.OutputChannel).toConstantValue(outputChannel);

    // Child container factory
    container
        .bind(TYPES.ChildContainerFactory)
        .toConstantValue((folder: WorkspaceFolder) => createChildContainer(container, folder));

    // Cross-folder orchestration
    container.bind(WorkspaceFolderManager).toSelf().inSingletonScope();
    container.bind(TestRunDispatcher).toSelf().inSingletonScope();
    return container;
}

function createChildContainer(parent: Container, workspaceFolder: WorkspaceFolder): Container {
    const child = new Container({ parent });

    // Per-folder bindings
    child.bind(TYPES.WorkspaceFolder).toConstantValue(workspaceFolder);
    child.bind(TYPES.FileChangedEmitter).toConstantValue(new EventEmitter<Uri>());

    child
        .bind(PHPUnitXML)
        .toDynamicValue(() => new PHPUnitXML())
        .inSingletonScope();
    child
        .bind(Configuration)
        .toDynamicValue(
            () => new Configuration(workspace.getConfiguration('phpunit', workspaceFolder.uri)),
        )
        .inSingletonScope();

    child
        .bind(ClassHierarchy)
        .toDynamicValue(() => new ClassHierarchy())
        .inSingletonScope();
    child
        .bind(TestParser)
        .toDynamicValue((context) => {
            const phpUnitXML = context.get(PHPUnitXML);
            const astParser = new ChainAstParser([
                new TreeSitterAstParser(),
                new PhpParserAstParser(),
            ]);
            return new TestParser(phpUnitXML, astParser);
        })
        .inSingletonScope();

    // Per-folder coverage (path mapping is workspace-specific)
    child
        .bind(PathReplacer)
        .toDynamicValue((ctx) => {
            const config = ctx.get(Configuration);
            return new PathReplacer(
                { cwd: workspaceFolder.uri.fsPath },
                config.get('paths') as Path,
            );
        })
        .inSingletonScope();
    child
        .bind(CloverParser)
        .toDynamicValue(() => new CloverParser())
        .inSingletonScope();
    child
        .bind(CoverageReader)
        .toDynamicValue((ctx) => new CoverageReader(ctx.get(CloverParser), ctx.get(PathReplacer)))
        .inSingletonScope();

    // Per-folder services
    child.bind(ProcessBuilderFactory).toSelf().inSingletonScope();
    child.bind(TestRunnerObserverFactory).toSelf().inSingletonScope();
    child.bind(TestRunnerBuilder).toSelf().inSingletonScope();
    child.bind(TestCollection).toSelf().inSingletonScope();
    child.bind(TestQueueBuilder).toSelf().inSingletonScope();
    child.bind(DebugSessionManager).toSelf().inSingletonScope();
    child.bind(TestRunHandler).toSelf().inSingletonScope();
    child.bind(TestFileDiscovery).toSelf().inSingletonScope();
    child.bind(TestFileWatcher).toSelf().inSingletonScope();
    child.bind(TestWatchManager).toSelf().inSingletonScope();
    return child;
}
