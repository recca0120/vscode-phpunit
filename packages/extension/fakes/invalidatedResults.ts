import type { TestController } from 'vscode';

export const invalidatedResults = (controller: TestController) =>
    (controller as unknown as { invalidated: string[] }).invalidated;
