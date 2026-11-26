import { minimatch } from 'minimatch';
import type { DocumentFilter, TextDocument } from 'vscode';
import { Disposable } from './types';

const languages = {
    match: (documentFilter: DocumentFilter, document: TextDocument) => {
        const pattern =
            typeof documentFilter.pattern === 'string'
                ? documentFilter.pattern
                : documentFilter.pattern!.pattern;

        return minimatch(document.uri.fsPath, pattern) ? 10 : 0;
    },
    registerDocumentLinkProvider: (_selector: any, _provider: any) => new Disposable(),
};

export { languages };
