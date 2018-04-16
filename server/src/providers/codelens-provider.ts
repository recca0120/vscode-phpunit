import { CodeLens, TextDocument } from 'vscode-languageserver-types';
import { Runner } from '../runner';

export class CodeLensProvider {
    constructor(private runner: Runner) {}

    provideCodeLenses(textDocument: TextDocument): CodeLens[] {
        return this.runner.getCodeLens(textDocument);
    }

    resolveCodeLens(codeLens: CodeLens): Promise<CodeLens> {
        return new Promise(resolve => {
            resolve(codeLens);
        });
    }
}
