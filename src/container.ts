import { Container } from 'inversify';
import { EventEmitter, type OutputChannel, type TestController, type Uri, workspace } from 'vscode';
import { PHPUnitLinkProvider, TestCommandRegistry } from './Commands';
import { Configuration } from './Configuration';
import { CoverageCollector } from './Coverage';
import { CollisionPrinter, ErrorDialogObserver, OutputChannelObserver } from './Observers';
import { OutputFormatter } from './Observers/Printers';
import { PHPUnitXML } from './PHPUnit';
import { TestCollection } from './TestCollection';
import { TestFileDiscovery, TestFileWatcher, TestWatchManager } from './TestDiscovery';
import { TestQueueBuilder, TestRunHandler, TestRunnerBuilder } from './TestExecution';
import { TYPES } from './types';

export function createContainer(ctrl: TestController, outputChannel: OutputChannel): Container {
    const container = new Container();

    // VS Code external objects (use Symbols)
    container.bind(TYPES.TestController).toConstantValue(ctrl);
    container.bind(TYPES.OutputChannel).toConstantValue(outputChannel);
    container.bind(TYPES.FileChangedEmitter).toConstantValue(new EventEmitter<Uri>());

    // PHPUnit layer (no decorators, use toDynamicValue)
    container
        .bind(PHPUnitXML)
        .toDynamicValue(() => new PHPUnitXML())
        .inSingletonScope();
    container
        .bind(Configuration)
        .toDynamicValue(() => new Configuration(workspace.getConfiguration('phpunit')))
        .inSingletonScope();

    // Abstract → Concrete
    container.bind(OutputFormatter).to(CollisionPrinter).inSingletonScope();

    // src/ layer classes (auto-resolve constructors)
    container.bind(CoverageCollector).toSelf().inSingletonScope();
    container.bind(ErrorDialogObserver).toSelf().inSingletonScope();
    container.bind(OutputChannelObserver).toSelf().inSingletonScope();
    container.bind(TestCollection).toSelf().inSingletonScope();
    container.bind(TestRunnerBuilder).toSelf().inSingletonScope();
    container.bind(TestQueueBuilder).toSelf().inSingletonScope();
    container.bind(TestRunHandler).toSelf().inSingletonScope();
    container.bind(TestFileDiscovery).toSelf().inSingletonScope();
    container.bind(TestFileWatcher).toSelf().inSingletonScope();
    container.bind(TestWatchManager).toSelf().inSingletonScope();
    container.bind(TestCommandRegistry).toSelf().inSingletonScope();
    container.bind(PHPUnitLinkProvider).toSelf().inSingletonScope();

    return container;
}
