import { CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver-types';

export interface Snippet {
    prefix: string;
    body: string[] | string;
    description: string;
}

export interface Sinppets {
    [index: string]: Snippet;
}

export const snippets: Sinppets = {
    testcase: {
        prefix: 'testcase',
        body: ['use PHPUnit\\Framework\\TestCase', 'class ${TM_FILENAME_BASE} extends TestCase', '{', '    $0', '}'],
        description: 'PHPUnit: test case declaration',
    },
    test: {
        prefix: 'test',
        body: ['public function test$1()', '{', '    $0', '}'],
        description: 'PHPUnit: test',
    },
    setup: {
        prefix: 'setup',
        body: ['protected function setUp()', '{', '    parent::setUp()', '    $0', '}'],
        description: 'PHPUnit: setup method declaration',
    },
    teardown: {
        prefix: 'teardown',
        body: ['protected function tearDown()', '{', '    parent::tearDown()', '    $0', '}'],
        description: 'PHPUnit: teardown method declaration',
    },
};

export class SnippetManager {
    private items: CompletionItem[] = [];

    constructor() {
        for (const name in snippets) {
            const snippet: Snippet = snippets[name];
            const body: string = snippet.body instanceof Array ? snippet.body.join('\n') : snippet.body;
            this.items.push({
                label: snippet.prefix,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                detail: body,
                insertText: body,
            });
        }
    }

    getCompletions(): CompletionItem[] {
        return this.items;
    }
}
