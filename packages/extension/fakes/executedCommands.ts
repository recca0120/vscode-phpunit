import { commands } from 'vscode';

export const executedCommands = () =>
    (commands as unknown as { executed: [string, unknown[]][] }).executed;
