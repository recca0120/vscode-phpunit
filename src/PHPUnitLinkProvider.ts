import {
    CancellationToken, DocumentLink, DocumentLinkProvider, Position, ProviderResult, Range, TextDocument,
} from 'vscode';
import { URI } from 'vscode-uri';

export class PHPUnitLinkProvider implements DocumentLinkProvider {
    private regex = /((?:[A-Z]:)?(?:\.{0,2}[\\/])?[^\s:]+\.php):(\d+)(?::(\d+))?/gi;

    provideDocumentLinks(document: TextDocument, _token: CancellationToken): ProviderResult<DocumentLink[]> {
        const links: DocumentLink[] = [];

        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            let match: RegExpExecArray | null;

            while ((match = this.regex.exec(line.text)) !== null) {
                const [fullMatch, filePath, lineStr, colStr] = match;
                const lineNumber = parseInt(lineStr, 10);

                const targetUri = URI.file(filePath).with({ fragment: `L${lineNumber}` });
                const start = new Position(lineIndex, match.index);
                const end = new Position(lineIndex, match.index + fullMatch.length);
                const range = new Range(start, end);

                links.push(new DocumentLink(range, targetUri));
            }
        }

        return links;
    }
}