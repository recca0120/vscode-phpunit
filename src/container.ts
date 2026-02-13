import { Container } from 'inversify';
import { EventEmitter, OutputChannel, TestController, Uri, workspace } from 'vscode';
import { Configuration } from './Configuration';
import { ContinuousTestRunner } from './ContinuousTestRunner';
import { CoverageCollector } from './CoverageCollector';
import { Handler } from './Handler';
import { CollisionPrinter, MessageObserver, OutputChannelObserver } from './Observers';
import { PHPUnitXML } from './PHPUnit';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';
import { TestCollection } from './TestCollection';
import { TestCommandRegistry } from './TestCommandRegistry';
import { TestDiscovery } from './TestDiscovery';
import { TestFileDiscovery } from './TestFileDiscovery';
import { TestFileWatcher } from './TestFileWatcher';
import { TestRunnerFactory } from './TestRunnerFactory';
import { TYPES } from './types';

export function createContainer(
    ctrl: TestController,
    outputChannel: OutputChannel,
): Container {
    const container = new Container();

    container.bind(TYPES.testController).toConstantValue(ctrl);
    container.bind(TYPES.outputChannel).toConstantValue(outputChannel);

    container.bind(TYPES.phpUnitXML).toDynamicValue(() =>
        new PHPUnitXML(),
    ).inSingletonScope();

    container.bind(TYPES.configuration).toDynamicValue(() =>
        new Configuration(workspace.getConfiguration('phpunit')),
    ).inSingletonScope();

    container.bind(TYPES.fileChangedEmitter).toDynamicValue(() =>
        new EventEmitter<Uri>(),
    ).inSingletonScope();

    container.bind(TYPES.printer).toDynamicValue((ctx) =>
        new CollisionPrinter(ctx.get(TYPES.phpUnitXML)),
    ).inSingletonScope();

    container.bind(TYPES.testCollection).toDynamicValue((ctx) =>
        new TestCollection(ctx.get(TYPES.testController), ctx.get(TYPES.phpUnitXML)),
    ).inSingletonScope();

    container.bind(TYPES.phpUnitLinkProvider).toDynamicValue((ctx) =>
        new PHPUnitLinkProvider(ctx.get(TYPES.phpUnitXML)),
    ).inSingletonScope();

    container.bind(TYPES.messageObserver).toDynamicValue((ctx) =>
        new MessageObserver(ctx.get(TYPES.configuration)),
    ).inSingletonScope();

    container.bind(TYPES.outputChannelObserver).toDynamicValue((ctx) =>
        new OutputChannelObserver(
            ctx.get(TYPES.outputChannel),
            ctx.get(TYPES.configuration),
            ctx.get(TYPES.printer),
        ),
    ).inSingletonScope();

    container.bind(TYPES.testRunnerFactory).toDynamicValue((ctx) =>
        new TestRunnerFactory(
            ctx.get(TYPES.outputChannelObserver),
            ctx.get(TYPES.messageObserver),
        ),
    ).inSingletonScope();

    container.bind(TYPES.coverageCollector).toDynamicValue(() =>
        new CoverageCollector(),
    ).inSingletonScope();

    container.bind(TYPES.testDiscovery).toDynamicValue((ctx) =>
        new TestDiscovery(ctx.get(TYPES.testCollection)),
    ).inSingletonScope();

    container.bind(TYPES.handler).toDynamicValue((ctx) =>
        new Handler(
            ctx.get(TYPES.testController),
            ctx.get(TYPES.phpUnitXML),
            ctx.get(TYPES.configuration),
            ctx.get(TYPES.testCollection),
            ctx.get(TYPES.testRunnerFactory),
            ctx.get(TYPES.coverageCollector),
            ctx.get(TYPES.testDiscovery),
        ),
    ).inSingletonScope();

    container.bind(TYPES.testCommandRegistry).toDynamicValue((ctx) =>
        new TestCommandRegistry(
            ctx.get(TYPES.testCollection),
            ctx.get(TYPES.handler),
            ctx.get(TYPES.testFileDiscovery),
        ),
    ).inSingletonScope();

    container.bind(TYPES.testFileDiscovery).toDynamicValue((ctx) =>
        new TestFileDiscovery(
            ctx.get(TYPES.configuration),
            ctx.get(TYPES.phpUnitXML),
            ctx.get(TYPES.testCollection),
        ),
    ).inSingletonScope();

    container.bind(TYPES.testFileWatcher).toDynamicValue((ctx) =>
        new TestFileWatcher(
            ctx.get(TYPES.testFileDiscovery),
            ctx.get(TYPES.testCollection),
            ctx.get(TYPES.fileChangedEmitter),
        ),
    ).inSingletonScope();

    container.bind(TYPES.continuousTestRunner).toDynamicValue((ctx) =>
        new ContinuousTestRunner(
            ctx.get(TYPES.handler),
            ctx.get(TYPES.testCollection),
            ctx.get(TYPES.fileChangedEmitter),
        ),
    ).inSingletonScope();

    return container;
}
