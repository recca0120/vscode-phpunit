import {
    BinaryDetector,
    ChainAstParser,
    ComposerAutoload,
    PHPUnitXML,
    PhpParserAstParser,
    TestIndex,
    TestParser,
    TreeSitterAstParser,
} from '@vscode-phpunit/phpunit';
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
import { ObserverFactory } from './Observers';
import { TestCollection } from './TestCollection';
import { TestFileDiscovery, TestFileWatcher, TestWatchManager } from './TestDiscovery';
import {
    DebugSessionManager,
    TestCommandFactory,
    TestQueueBuilder,
    TestRunDispatcher,
    TestRunHandler,
    XdebugFactory,
} from './TestExecution';
import { TYPES } from './types';
import { WorkspaceFolderManager } from './WorkspaceFolderManager';

export function createParentContainer(
    ctrl: TestController,
    outputChannel: OutputChannel,
): Container {
    const container = new Container();

    container.bind(TYPES.TestController).toConstantValue(ctrl);
    container.bind(TYPES.OutputChannel).toConstantValue(outputChannel);

    container
        .bind(TYPES.ChildContainerFactory)
        .toConstantValue((folder: WorkspaceFolder) => createChildContainer(container, folder));

    container.bind(WorkspaceFolderManager).toSelf().inSingletonScope();
    container.bind(TestRunDispatcher).toSelf().inSingletonScope();
    return container;
}

function createChildContainer(parent: Container, workspaceFolder: WorkspaceFolder): Container {
    const child = new Container({ parent });

    child.bind(TYPES.WorkspaceFolder).toConstantValue(workspaceFolder);
    child.bind(TYPES.FileChangedEmitter).toConstantValue(new EventEmitter<Uri>());

    child
        .bind(PHPUnitXML)
        .toDynamicValue(() => new PHPUnitXML())
        .inSingletonScope();
    child
        .bind(BinaryDetector)
        .toDynamicValue(() => new BinaryDetector(workspaceFolder.uri.fsPath))
        .inSingletonScope();
    child
        .bind(Configuration)
        .toDynamicValue(
            (ctx) =>
                new Configuration(
                    workspace.getConfiguration('phpunit', workspaceFolder.uri),
                    ctx.get(BinaryDetector),
                ),
        )
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

    child.bind(XdebugFactory).toSelf().inSingletonScope();
    child.bind(TestCommandFactory).toSelf().inSingletonScope();
    child.bind(ObserverFactory).toSelf().inSingletonScope();
    child
        .bind(ComposerAutoload)
        .toDynamicValue((context) => {
            const phpUnitXML = context.get(PHPUnitXML);
            return new ComposerAutoload(() => phpUnitXML.root());
        })
        .inSingletonScope();
    child
        .bind(TestIndex)
        .toDynamicValue(
            (context) =>
                new TestIndex(
                    context.get(PHPUnitXML),
                    context.get(TestParser),
                    context.get(ComposerAutoload),
                ),
        )
        .inSingletonScope();
    child.bind(TestCollection).toSelf().inSingletonScope();
    child.bind(TestQueueBuilder).toSelf().inSingletonScope();
    child.bind(DebugSessionManager).toSelf().inSingletonScope();
    child.bind(TestRunHandler).toSelf().inSingletonScope();
    child.bind(TestFileDiscovery).toSelf().inSingletonScope();
    child.bind(TestFileWatcher).toSelf().inSingletonScope();
    child.bind(TestWatchManager).toSelf().inSingletonScope();
    return child;
}
