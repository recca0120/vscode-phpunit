import { vi } from 'vitest';
import type { Disposable, ExtensionContext } from 'vscode';

export const createExtensionContext = (): ExtensionContext => {
    const subscriptions: Disposable[] = [];
    subscriptions.push = vi.fn((...items: Disposable[]) =>
        Array.prototype.push.apply(subscriptions, items),
    );

    return { subscriptions } as unknown as ExtensionContext;
};
