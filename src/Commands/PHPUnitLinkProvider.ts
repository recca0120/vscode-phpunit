import {
    type CancellationToken,
    DocumentLink,
    type DocumentLinkProvider,
    Position,
    type ProviderResult,
    Range,
    type TextDocument,
} from 'vscode';
import { URI } from 'vscode-uri';
import { PHPUnitXML } from '../PHPUnit';

export class PHPUnitLinkProvider implements DocumentLinkProvider {
    private regex = /((?:[A-Z]:)?(?:\.{0,2}[\\/])?[^\s:]+\.php):(\d+)(?::(\d+))?/gi;

    constructor(private getPhpUnitXMLs: () => PHPUnitXML[]) {}

    provideDocumentLinks(
        document: TextDocument,
        _token: CancellationToken,
    ): ProviderResult<DocumentLink[]> {
        const links: DocumentLink[] = [];
        const phpUnitXMLs = this.getPhpUnitXMLs();

        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            let match: RegExpExecArray | null;

            while ((match = this.regex.exec(line.text)) !== null) {
                const [fullMatch, filePath, lineStr] = match;
                const lineNumber = parseInt(lineStr, 10);

                // Try each PHPUnitXML to resolve the path
                let resolvedPath = filePath;
                for (const xml of phpUnitXMLs) {
                    const resolved = xml.path(filePath);
                    if (resolved !== filePath) {
                        resolvedPath = resolved;
                        break;
                    }
                }

                const targetUri = URI.file(resolvedPath).with({
                    fragment: `L${lineNumber}`,
                });
                const start = new Position(lineIndex, match.index);
                const end = new Position(lineIndex, match.index + fullMatch.length);
                const range = new Range(start, end);

                links.push(new DocumentLink(range, targetUri));
            }
        }

        return links;
    }
}
