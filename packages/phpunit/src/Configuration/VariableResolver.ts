import os from 'node:os';
import path from 'node:path';
import {
    VAR_PATH_SEPARATOR,
    VAR_PATH_SEPARATOR_SHORT,
    VAR_PWD,
    VAR_USER_HOME,
    VAR_WORKSPACE_FOLDER,
    VAR_WORKSPACE_FOLDER_BASENAME,
} from '../constants';

function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class VariableResolver {
    private readonly variables = new Map<string, string>();

    constructor(cwd: string, workspaceFolder: string) {
        this.variables.set(VAR_PWD, cwd);
        this.variables.set(VAR_WORKSPACE_FOLDER, workspaceFolder);
        this.variables.set(
            VAR_WORKSPACE_FOLDER_BASENAME,
            workspaceFolder ? path.basename(workspaceFolder) : '',
        );
        this.variables.set(VAR_USER_HOME, os.homedir());
        this.variables.set(VAR_PATH_SEPARATOR, path.sep);
        this.variables.set(VAR_PATH_SEPARATOR_SHORT, path.sep);
    }

    has(name: string) {
        return this.variables.has(name);
    }

    get(name: string) {
        return this.variables.get(name);
    }

    resolve(text: string) {
        for (const [key, value] of this.variables) {
            text = text.replace(new RegExp(escapeRegExp(key), 'g'), value);
        }

        return text;
    }
}
