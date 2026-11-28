import type { Mock } from 'vitest';
import {
    type CancellationToken,
    CancellationTokenSource,
    commands,
    type ExtensionContext,
    type OutputChannel,
    type TestItem,
    type TestRun,
    type TestRunProfile,
    TestRunProfileKind,
    window,
} from 'vscode';
import { findItem } from '../../test-support/testItems';
import { activate } from '../extension';

export type RunOptions = {
    kind?: TestRunProfileKind;
    continuous?: boolean;
    token?: CancellationToken;
};

export const activateExtension = async (context: ExtensionContext) => {
    const { testController: controller } = await activate(context);

    const profile = (kind = TestRunProfileKind.Run): TestRunProfile => {
        const found = (controller.createRunProfile as Mock).mock.results
            .map(({ value }) => value as TestRunProfile)
            .find((created) => created.kind === kind);
        if (!found) {
            throw new Error(`no run profile of kind ${kind}`);
        }
        return found;
    };

    const run = async (
        include?: string | (string | TestItem | undefined)[],
        { kind, continuous, token }: RunOptions = {},
    ) => {
        const items = include
            ? [include]
                  .flat()
                  .map((item) =>
                      typeof item === 'string' ? findItem(controller.items, item) : item,
                  )
            : undefined;
        const runProfile = profile(kind);
        const request = {
            include: items,
            exclude: [],
            profile: runProfile,
            ...(continuous && { continuous }),
        };
        await runProfile.runHandler(request as never, token ?? new CancellationTokenSource().token);
        return request;
    };

    return {
        controller,
        profile,
        outputChannel: (window.createOutputChannel as Mock).mock.results[0].value as OutputChannel,
        run,
        command: (name: string, ...args: unknown[]) => commands.executeCommand(name, ...args),
        resolve: async () => controller.resolveHandler?.(undefined),
        refresh: async () => controller.refreshHandler?.(undefined as never),
        testRuns: () =>
            (controller.createTestRun as Mock).mock.results.map(({ value }) => value as TestRun),
    };
};

export type Extension = Awaited<ReturnType<typeof activateExtension>>;
