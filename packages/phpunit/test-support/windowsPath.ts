export const phpUnitProjectWin = (path: string) =>
    `C:\\vscode\\${path}`.replace(/\//g, '\\').replace(/\\$/g, '');
