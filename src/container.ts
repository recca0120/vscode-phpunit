import { Container } from 'inversify';
import { EventEmitter, type OutputChannel, type TestController, type Uri, workspace } from 'vscode';
import { Configuration } from './Configuration';
import { CoverageCollector } from './CoverageCollector';
import { CollisionPrinter, ErrorDialogObserver, OutputChannelObserver } from './Observers';
import { PHPUnitXML } from './PHPUnit';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';
import { TestCollection } from './TestCollection';
import { TestCommandRegistry } from './TestCommandRegistry';
import { TestFileDiscovery } from './TestFileDiscovery';
import { TestFileWatcher } from './TestFileWatcher';
import { TestQueueBuilder } from './TestQueueBuilder';
import { TestRunHandler } from './TestRunHandler';
import { TestRunnerBuilder } from './TestRunnerBuilder';
import { TestWatchManager } from './TestWatchManager';
import { TYPES } from './types';

export function createContainer(ctrl: TestController, outputChannel: OutputChannel): Container {
    const container = new Container();

    container.bind(TYPES.testController).toConstantValue(ctrl);
    container.bind(TYPES.outputChannel).toConstantValue(outputChannel);

    bindCoreServices(container);
    bindObservers(container);
    bindTestServices(container);

    return container;
}

function bindCoreServices(container: Container) {
    container
        .bind(TYPES.phpUnitXML)
        .toDynamicValue(() => new PHPUnitXML())
        .inSingletonScope();

    container
        .bind(TYPES.configuration)
        .toDynamicValue(() => new Configuration(workspace.getConfiguration('phpunit')))
        .inSingletonScope();

    container
        .bind(TYPES.fileChangedEmitter)
        .toDynamicValue(() => new EventEmitter<Uri>())
        .inSingletonScope();

    container
        .bind(TYPES.phpUnitLinkProvider)
        .toDynamicValue((ctx) => new PHPUnitLinkProvider(ctx.get(TYPES.phpUnitXML)))
        .inSingletonScope();
}

function bindObservers(container: Container) {
    container
        .bind(TYPES.outputFormatter)
        .toDynamicValue((ctx) => new CollisionPrinter(ctx.get(TYPES.phpUnitXML)))
        .inSingletonScope();

    container
        .bind(TYPES.errorDialogObserver)
        .toDynamicValue((ctx) => new ErrorDialogObserver(ctx.get(TYPES.configuration)))
        .inSingletonScope();

    container
        .bind(TYPES.outputChannelObserver)
        .toDynamicValue(
            (ctx) =>
                new OutputChannelObserver(
                    ctx.get(TYPES.outputChannel),
                    ctx.get(TYPES.configuration),
                    ctx.get(TYPES.outputFormatter),
                ),
        )
        .inSingletonScope();
}

function bindTestServices(container: Container) {
    container
        .bind(TYPES.testCollection)
        .toDynamicValue(
            (ctx) => new TestCollection(ctx.get(TYPES.testController), ctx.get(TYPES.phpUnitXML)),
        )
        .inSingletonScope();

    container
        .bind(TYPES.testRunnerBuilder)
        .toDynamicValue(
            (ctx) =>
                new TestRunnerBuilder(
                    ctx.get(TYPES.outputChannelObserver),
                    ctx.get(TYPES.errorDialogObserver),
                ),
        )
        .inSingletonScope();

    container
        .bind(TYPES.coverageCollector)
        .toDynamicValue(() => new CoverageCollector())
        .inSingletonScope();

    container
        .bind(TYPES.testQueueBuilder)
        .toDynamicValue((ctx) => new TestQueueBuilder(ctx.get(TYPES.testCollection)))
        .inSingletonScope();

    container
        .bind(TYPES.testRunHandler)
        .toDynamicValue(
            (ctx) =>
                new TestRunHandler(
                    ctx.get(TYPES.testController),
                    ctx.get(TYPES.phpUnitXML),
                    ctx.get(TYPES.configuration),
                    ctx.get(TYPES.testCollection),
                    ctx.get(TYPES.testRunnerBuilder),
                    ctx.get(TYPES.coverageCollector),
                    ctx.get(TYPES.testQueueBuilder),
                ),
        )
        .inSingletonScope();

    container
        .bind(TYPES.testCommandRegistry)
        .toDynamicValue(
            (ctx) =>
                new TestCommandRegistry(
                    ctx.get(TYPES.testCollection),
                    ctx.get(TYPES.testRunHandler),
                    ctx.get(TYPES.testFileDiscovery),
                ),
        )
        .inSingletonScope();

    container
        .bind(TYPES.testFileDiscovery)
        .toDynamicValue(
            (ctx) =>
                new TestFileDiscovery(
                    ctx.get(TYPES.configuration),
                    ctx.get(TYPES.phpUnitXML),
                    ctx.get(TYPES.testCollection),
                ),
        )
        .inSingletonScope();

    container
        .bind(TYPES.testFileWatcher)
        .toDynamicValue(
            (ctx) =>
                new TestFileWatcher(
                    ctx.get(TYPES.testFileDiscovery),
                    ctx.get(TYPES.testCollection),
                    ctx.get(TYPES.fileChangedEmitter),
                ),
        )
        .inSingletonScope();

    container
        .bind(TYPES.testWatchManager)
        .toDynamicValue(
            (ctx) =>
                new TestWatchManager(
                    ctx.get(TYPES.testRunHandler),
                    ctx.get(TYPES.testCollection),
                    ctx.get(TYPES.fileChangedEmitter),
                ),
        )
        .inSingletonScope();
}
