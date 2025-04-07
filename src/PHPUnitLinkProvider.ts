import { DocumentLink, DocumentLinkProvider, ProviderResult, Range, TextDocument } from 'vscode';
import { URI } from 'vscode-uri';

export class PHPUnitLinkProvider implements DocumentLinkProvider {
    private regex = /(\/[^\s:]+\.php):(\d+)/g;

    provideDocumentLinks(document: TextDocument): ProviderResult<DocumentLink[]> {
        const links: DocumentLink[] = [];

        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            let match: RegExpExecArray | null;

            while ((match = this.regex.exec(line.text)) !== null) {
                const [fullMatch, filePath, lineNumberStr] = match;
                const lineNumber = parseInt(lineNumberStr, 10);

                const start = line.range.start.translate(0, match.index);
                const end = start.translate(0, fullMatch.length);
                const range = new Range(start, end);
                const targetUri = URI.file(filePath).with({ fragment: `L${lineNumber}` });

                links.push(new DocumentLink(range, targetUri));
            }
        }

        return links;
    }
}