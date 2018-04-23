import { SnippetCollection, Snippet, snippets } from '../../src/phpunit';
import { CompletionItemKind, InsertTextFormat, CompletionItem } from 'vscode-languageserver-types';

describe('Snippet Manager Test', () => {
    const snippetCollect: SnippetCollection = new SnippetCollection();
    const completions: CompletionItem[] = snippetCollect.all();

    it('it should get testcase completion item', async () => {
        const name = 'testcase';
        const snippet: Snippet = snippets[name];
        const body = snippet.body instanceof Array ? snippet.body.join('\n') : snippet.body;

        expect(completions[0]).toEqual({
            label: snippet.prefix,
            kind: CompletionItemKind.Snippet,
            insertTextFormat: InsertTextFormat.Snippet,
            detail: name,
            documentation: body,
            insertText: body,
        });
    });

    it('it should get test completion item', async () => {
        const name = 'test';
        const snippet: Snippet = snippets[name];
        const body = snippet.body instanceof Array ? snippet.body.join('\n') : snippet.body;

        expect(completions[1]).toEqual({
            label: snippet.prefix,
            kind: CompletionItemKind.Snippet,
            insertTextFormat: InsertTextFormat.Snippet,
            detail: name,
            documentation: body,
            insertText: body,
        });
    });

    it('it should get setup completion item', async () => {
        const name = 'setup';
        const snippet: Snippet = snippets[name];
        const body = snippet.body instanceof Array ? snippet.body.join('\n') : snippet.body;

        expect(completions[2]).toEqual({
            label: snippet.prefix,
            kind: CompletionItemKind.Snippet,
            insertTextFormat: InsertTextFormat.Snippet,
            detail: name,
            documentation: body,
            insertText: body,
        });
    });

    it('it should get teardown completion item', async () => {
        const name = 'teardown';
        const snippet: Snippet = snippets[name];
        const body = snippet.body instanceof Array ? snippet.body.join('\n') : snippet.body;

        expect(completions[3]).toEqual({
            label: snippet.prefix,
            kind: CompletionItemKind.Snippet,
            insertTextFormat: InsertTextFormat.Snippet,
            detail: name,
            documentation: body,
            insertText: body,
        });
    });
});
