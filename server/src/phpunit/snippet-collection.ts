import { CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver-types';

export interface Snippet {
    prefix: string;
    body: string[] | string;
    description?: string;
    scope?: string;
}

export interface Sinppets {
    [index: string]: Snippet;
}

export const snippets: Sinppets = {
    testcase: {
        prefix: 'testcase',
        body: [
            '<?php',
            '',
            'use PHPUnit\\Framework\\TestCase;',
            '',
            'class ${TM_FILENAME_BASE} extends TestCase',
            '{',
            '    $0',
            '}',
        ],
        description: 'PHPUnit: test case declaration',
        scope: 'source.php',
    },
    test: {
        prefix: 'test',
        body: ['/** @test */', 'public function ${1:test_name}()', '{', '    ${0:// assertions}', '}'],
        description: 'PHPUnit: test',
        scope: 'source.php',
    },
    setup: {
        prefix: 'setup',
        body: ['protected function setUp()', '{', '    parent::setUp()', '    ${0:// }', '}'],
        description: 'PHPUnit: setup method declaration',
        scope: 'source.php',
    },
    teardown: {
        prefix: 'teardown',
        body: ['protected function tearDown()', '{', '    parent::tearDown()', '    ${0:// }', '}'],
        description: 'PHPUnit: teardown method declaration',
        scope: 'source.php',
    },
    assahk: {
        prefix: 'assahk',
        body: "\\$this->assertArrayHasKey(${1:key}, ${2:array}${3:, '${4:message}'});",
        description: 'assertArrayHasKey',
        scope: 'source.php',
    },
    assae: {
        prefix: 'assae',
        body: '\\$this->assertAttributeEquals(${1:expectedValue}, ${2:attributeName}, ${3:object});',
        description: 'assertAttributeEquals',
        scope: 'source.php',
    },
    asscha: {
        prefix: 'asscha',
        body: "\\$this->assertClassHasAttribute(${1:attributeName}, ${2:className}${3:, '${4:message}'});",
        description: 'assertClassHasAttribute',
        scope: 'source.php',
    },
    asschsa: {
        prefix: 'asschsa',
        body: "\\$this->assertClassHasStaticAttribute(${1:attributeName}, ${2:className}${3:, '${4:message}'});",
        description: 'assertClassHasStaticAttribute',
        scope: 'source.php',
    },
    assc: {
        prefix: 'assc',
        body: "\\$this->assertContains(${1:needle}, ${2:haystack}${3:, '${4:message}'});",
        description: 'assertContains',
        scope: 'source.php',
    },
    assco: {
        prefix: 'assco',
        body: "\\$this->assertContainsOnly(${1:type}, ${2:haystack}${3:, '${4:isNativeType}'}${5:, '${6:message}'});",
        description: 'assertContainsOnly',
        scope: 'source.php',
    },
    asscu: {
        prefix: 'asscu',
        body: "\\$this->assertCount(${1:expectedCount}, ${2:haystack}${3:, '${4:message}'});",
        description: 'assertCount',
        scope: 'source.php',
    },
    assem: {
        prefix: 'assem',
        body: "\\$this->assertEmpty(${1:actual}${2:, '${3:message}'});",
        description: 'assertEmpty',
        scope: 'source.php',
    },
    assexml: {
        prefix: 'assexml',
        body:
            "\\$this->assertEqualXMLStructure(${1:expectedElement}, ${2:actualElement}${3:, '${4:checkAttributes}'}${5:, '${6:message}'});",
        description: 'assertEqualXMLStructure',
        scope: 'source.php',
    },
    asse: {
        prefix: 'asse',
        body: "\\$this->assertEquals(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertEquals',
        scope: 'source.php',
    },
    assf: {
        prefix: 'assf',
        body: "\\$this->assertFalse(${1:actual}${2:, '${3:message}'});",
        description: 'assertFalse',
        scope: 'source.php',
    },
    assfe: {
        prefix: 'assfe',
        body: "\\$this->assertFileEquals(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertFileEquals',
        scope: 'source.php',
    },
    assfx: {
        prefix: 'assfx',
        body: "\\$this->assertFileExists(${1:filename}${2:, '${3:message}'});",
        description: 'assertFileExists',
        scope: 'source.php',
    },
    assgt: {
        prefix: 'assgt',
        body: "\\$this->assertGreaterThan(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertGreaterThan',
        scope: 'source.php',
    },
    assgte: {
        prefix: 'assgte',
        body: "\\$this->assertGreaterThanOrEqual(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertGreaterThanOrEqual',
        scope: 'source.php',
    },
    assio: {
        prefix: 'assio',
        body: "\\$this->assertInstanceOf(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertInstanceOf',
        scope: 'source.php',
    },
    assit: {
        prefix: 'assit',
        body: "\\$this->assertInternalType(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertInternalType',
        scope: 'source.php',
    },
    asslt: {
        prefix: 'asslt',
        body: "\\$this->assertLessThan(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertLessThan',
        scope: 'source.php',
    },
    asslte: {
        prefix: 'asslte',
        body: "\\$this->assertLessThanOrEqual(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertLessThanOrEqual',
        scope: 'source.php',
    },
    assnn: {
        prefix: 'assnn',
        body: "\\$this->assertNotNull(${1:actual}${2:, '${3:message}'});",
        description: 'assertNotNull',
        scope: 'source.php',
    },
    assn: {
        prefix: 'assn',
        body: "\\$this->assertNull(${1:actual}${2:, '${3:message}'});",
        description: 'assertNull',
        scope: 'source.php',
    },
    assoha: {
        prefix: 'assoha',
        body: "\\$this->assertObjectHasAttribute(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertObjectHasAttribute',
        scope: 'source.php',
    },
    assre: {
        prefix: 'assre',
        body: "\\$this->assertRegExp(${1:pattern}, ${2:string}${3:, '${4:message}'});",
        description: 'assertRegExp',
        scope: 'source.php',
    },
    asss: {
        prefix: 'asss',
        body: "\\$this->assertSame(${1:expected}, ${2:actual}${3:, '${4:message}'});",
        description: 'assertSame',
        scope: 'source.php',
    },
    asssc: {
        prefix: 'asssc',
        body:
            "\\$this->assertSelectCount(${1:selector}, ${2:count}$, ${3:actual}{4:, '${5:message}'}{6:, '${7:isHtml}'});",
        description: 'assertSelectCount',
        scope: 'source.php',
    },
    assse: {
        prefix: 'assse',
        body:
            "\\$this->assertSelectEquals(${1:selector}, ${2:content}, ${3:count}, ${4:actual}${5:, '${6:message}'}${7:, '${8:isHtml}'});",
        description: 'assertSelectEquals',
        scope: 'source.php',
    },
    asssre: {
        prefix: 'asssre',
        body:
            "\\$this->assertSelectRegExp(${1:selector}, ${2:pattern}, ${3:count}, ${4:actual}${5:, '${6:message}'}${7:, '${8:isHtml}'});",
        description: 'assertSelectRegExp',
        scope: 'source.php',
    },
    asssew: {
        prefix: 'asssew',
        body: "\\$this->assertStringEndsWith(${1:suffix}, ${2:string}${3:, '${4:message}'});",
        description: 'assertStringEndsWith',
        scope: 'source.php',
    },
    asssef: {
        prefix: 'asssef',
        body: "\\$this->assertStringEqualsFile(${1:expectedFile}, ${2:actualString}${3:, '${4:message}'});",
        description: 'assertStringEqualsFile',
        scope: 'source.php',
    },
    asssmf: {
        prefix: 'asssmf',
        body: "\\$this->assertStringMatchesFormat(${1:format}, ${2:string}${3:, '${4:message}'});",
        description: 'assertStringMatchesFormat',
        scope: 'source.php',
    },
    asssmff: {
        prefix: 'asssmff',
        body: "\\$this->assertStringMatchesFormatFile(${1:formatFile}, ${2:string}${3:, '${4:message}'});",
        description: 'assertStringMatchesFormatFile',
        scope: 'source.php',
    },
    assssw: {
        prefix: 'assssw',
        body: "\\$this->assertStringStartsWith(${1:prefix}, ${2:string}${3:, '${4:message}'});",
        description: 'assertStringStartsWith',
        scope: 'source.php',
    },
    assta: {
        prefix: 'assta',
        body: "\\$this->assertTag(${1:matcher}, ${2:actual}${3:, '${4:message}'}${5:, '${6:isHtml}'});",
        description: 'assertTag',
        scope: 'source.php',
    },
    asst: {
        prefix: 'asst',
        body: "\\$this->assertTrue(${1:actual}${2:, '${3:message}'});",
        description: 'assertTrue',
        scope: 'source.php',
    },
    assxmlfef: {
        prefix: 'assxmlfef',
        body: "\\$this->assertXmlFileEqualsXmlFile(${1:expectedFile}, ${2:actualFile}${3:, '${4:message}'});",
        description: 'assertXmlFileEqualsXmlFile',
        scope: 'source.php',
    },
    assxmlsef: {
        prefix: 'assxmlsef',
        body: "\\$this->assertXmlStringEqualsXmlFile(${1:expectedFile}, ${2:actualXml}${3:, '${4:message}'});",
        description: 'assertXmlStringEqualsXmlFile',
        scope: 'source.php',
    },
    assxmlses: {
        prefix: 'assxmlses',
        body: "\\$this->assertXmlStringEqualsXmlString(${1:expectedXml}, ${2:actualXml}${3:, '${4:message}'});",
        description: 'assertXmlStringEqualsXmlString',
        scope: 'source.php',
    },
};

export class SnippetCollection {
    private items: CompletionItem[] = [];

    constructor() {
        for (const name in snippets) {
            const snippet: Snippet = snippets[name];
            const body: string = snippet.body instanceof Array ? snippet.body.join('\n') : snippet.body;
            this.items.push({
                label: snippet.prefix,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                detail: snippet.description || name,
                documentation: body.replace(/\$\{\d+:(.*)\}/g, '$1'),
                insertText: body,
            });
        }
    }

    all(): CompletionItem[] {
        return this.items;
    }
}
