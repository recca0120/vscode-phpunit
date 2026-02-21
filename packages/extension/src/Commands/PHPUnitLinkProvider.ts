import type { PHPUnitXML } from '@vscode-phpunit/phpunit';
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

            for (const match of line.text.matchAll(this.regex)) {
                const [fullMatch, filePath, lineStr] = match;
                const lineNumber = Number.parseInt(lineStr, 10);
                const resolvedPath = this.resolvePath(filePath, phpUnitXMLs);

                const targetUri = URI.file(resolvedPath).with({
                    fragment: `L${lineNumber}`,
                });
                const start = new Position(lineIndex, match.index);
                const end = new Position(lineIndex, match.index + fullMatch.length);

                links.push(new DocumentLink(new Range(start, end), targetUri));
            }
        }

        return links;
    }

    private resolvePath(filePath: string, phpUnitXMLs: PHPUnitXML[]): string {
        for (const xml of phpUnitXMLs) {
            const resolved = xml.path(filePath);
            if (resolved !== filePath) {
                return resolved;
            }
        }
        return filePath;
    }
}
