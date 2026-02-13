import { Container } from 'inversify';
import { OutputChannel, TestController } from 'vscode';
import { Configuration } from './Configuration';
import { Handler } from './Handler';
import { CollisionPrinter } from './Observers';
import { PHPUnitXML } from './PHPUnit';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';
import { TestCollection } from './TestCollection';
import { TestRunnerFactory } from './TestRunnerFactory';
import { TYPES } from './types';

export function createContainer(
    phpUnitXML: PHPUnitXML,
    ctrl: TestController,
    outputChannel: OutputChannel,
    configuration: Configuration,
): Container {
    const container = new Container();

    container.bind(TYPES.phpUnitXML).toConstantValue(phpUnitXML);
    container.bind(TYPES.testController).toConstantValue(ctrl);
    container.bind(TYPES.outputChannel).toConstantValue(outputChannel);
    container.bind(TYPES.configuration).toConstantValue(configuration);

    container.bind(TYPES.printer).toDynamicValue((ctx) =>
        new CollisionPrinter(ctx.get(TYPES.phpUnitXML)),
    ).inSingletonScope();

    container.bind(TYPES.testCollection).toDynamicValue((ctx) =>
        new TestCollection(ctx.get(TYPES.testController), ctx.get(TYPES.phpUnitXML)),
    ).inSingletonScope();

    container.bind(TYPES.phpUnitLinkProvider).toDynamicValue((ctx) =>
        new PHPUnitLinkProvider(ctx.get(TYPES.phpUnitXML)),
    ).inSingletonScope();

    container.bind(TYPES.testRunnerFactory).toDynamicValue((ctx) =>
        new TestRunnerFactory(
            ctx.get(TYPES.outputChannel),
            ctx.get(TYPES.configuration),
            ctx.get(TYPES.printer),
        ),
    ).inSingletonScope();

    container.bind(TYPES.handler).toDynamicValue((ctx) =>
        new Handler(
            ctx.get(TYPES.testController),
            ctx.get(TYPES.phpUnitXML),
            ctx.get(TYPES.configuration),
            ctx.get(TYPES.testCollection),
            ctx.get(TYPES.testRunnerFactory),
        ),
    ).inSingletonScope();

    return container;
}
