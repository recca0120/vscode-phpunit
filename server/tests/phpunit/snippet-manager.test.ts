import { Filesystem, FilesystemContract } from '../../../server/src/filesystem';
import { os, OS } from '../../src/helpers';
import { Parameters, PhpUnit } from '../../src/phpunit';
import { projectUri } from '../helpers';
import { resolve } from 'path';
import { TextlineRange, Process } from './../../src/phpunit';
import { SnippetManager, snippets, Snippet } from './../../src/phpunit/snippet-manager';
import { CompletionItemKind, InsertTextFormat, CompletionItem } from 'vscode-languageserver-types';

describe('Snippet Manager Test', () => {
    const snippetManager: SnippetManager = new SnippetManager();
    const completions: CompletionItem[] = snippetManager.getCompletions();

    it('it should get testcase completion item', async () => {
        const name = 'testcase';
        const snippet: Snippet = snippets[name];
        const body = snippet.body instanceof Array ? snippet.body.join('\n') : snippet.body;

        expect(completions[0]).toEqual({
            label: snippet.prefix,
            kind: CompletionItemKind.Snippet,
            insertTextFormat: InsertTextFormat.Snippet,
            detail: body,
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
            detail: body,
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
            detail: body,
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
            detail: body,
            insertText: body,
        });
    });
});
