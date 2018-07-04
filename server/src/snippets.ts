import { CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver-types';

export interface Snippet {
    prefix: string;
    body: string;
    description?: string;
    scope?: string;
}

export interface SinppetJson {
    [index: string]: Snippet;
}

export const snippetJson: SinppetJson = {
    /* Assertions */
    assertArrayHasKey: {
        prefix: 'assert:ArrayHasKey',
        body: '\\$this->assertArrayHasKey($${1:key}, $${2:array});',
        description: "assertArrayHasKey(mixed $key, array $array[, string $message = ''])",
        scope: 'source.php',
    },
    assertClassHasAttribute: {
        prefix: 'assert:ClassHasAttribute',
        body: '\\$this->assertClassHasAttribute($${1:attributeName}, $${2:className});',
        description: "assertClassHasAttribute(string $attributeName, string $className[, string $message = ''])",
        scope: 'source.php',
    },
    assertArraySubset: {
        prefix: 'assert:ArraySubset',
        body: '\\$this->assertArraySubset($${1:subset}, $${2:array});',
        description: "assertArraySubset(array $subset, array $array[, bool $strict = '', string $message = ''])",
        scope: 'source.php',
    },
    assertClassHasStaticAttribute: {
        prefix: 'assert:ClassHasStaticAttribute',
        body: '\\$this->assertClassHasStaticAttribute($${1:attributeName}, $${2:className});',
        description: "assertClassHasStaticAttribute(string $attributeName, string $className[, string $message = ''])",
        scope: 'source.php',
    },
    assertContains: {
        prefix: 'assert:Contains',
        body: '\\$this->assertContains($${1:needle}, $${2:haystack});',
        description:
            "assertContains(string $needle, string $haystack[, string $message = '', boolean $ignoreCase = false])",
        scope: 'source.php',
    },
    assertContainsOnly: {
        prefix: 'assert:ContainsOnly',
        body: '\\$this->assertContainsOnly($${1:type}, $${2:haystack});',
        description:
            "assertContainsOnly(string $type, Iterator|array $haystack[, boolean $isNativeType = null, string $message = ''])",
        scope: 'source.php',
    },
    assertContainsOnlyInstancesOf: {
        prefix: 'assert:ContainsOnlyInstancesOf',
        body: '\\$this->assertContainsOnlyInstancesOf($${1:className}, $${2:haystack});',
        description:
            "assertContainsOnlyInstancesOf(string $className, Traversable|array $haystack[, string $message = ''])",
        scope: 'source.php',
    },
    assertCount: {
        prefix: 'assert:Count',
        body: '\\$this->assertCount($${1:expectedCount}, $${2:haystack});',
        description: "assertCount($expectedCount, $haystack[, string $message = ''])",
        scope: 'source.php',
    },
    assertDirectoryExists: {
        prefix: 'assert:DirectoryExists',
        body: '\\$this->assertDirectoryExists($${1:directory});',
        description: "assertDirectoryExists(string $directory[, string $message = ''])",
        scope: 'source.php',
    },
    assertDirectoryIsReadable: {
        prefix: 'assert:DirectoryIsReadable',
        body: '\\$this->assertDirectoryIsReadable($${1:directory});',
        description: "assertDirectoryIsReadable(string $directory[, string $message = ''])",
        scope: 'source.php',
    },
    assertDirectoryIsWritable: {
        prefix: 'assert:DirectoryIsWritable',
        body: '\\$this->assertDirectoryIsWritable($${1:directory});',
        description: "assertDirectoryIsWritable(string $directory[, string $message = ''])",
        scope: 'source.php',
    },
    assertEmpty: {
        prefix: 'assert:Empty',
        body: '\\$this->assertEmpty($${1:actual});',
        description: "assertEmpty(mixed $actual[, string $message = ''])",
        scope: 'source.php',
    },
    assertEqualXMLStructure: {
        prefix: 'assert:EqualXMLStructure',
        body: '\\$this->assertEqualXMLStructure($${1:expectedElement}, $${2:actualElement});',
        description:
            "assertEqualXMLStructure(DOMElement $expectedElement, DOMElement $actualElement[, boolean $checkAttributes = false, string $message = ''])",
        scope: 'source.php',
    },
    assertEquals: {
        prefix: 'assert:Equals',
        body: '\\$this->assertEquals($${1:expected}, $${2:actual});',
        description: "assertEquals($expected, $actual[, string $message = ''])",
        scope: 'source.php',
    },
    assertFalse: {
        prefix: 'assert:False',
        body: '\\$this->assertFalse($${1:condition});',
        description: "assertFalse(bool $condition[, string $message = ''])",
        scope: 'source.php',
    },
    assertFileEquals: {
        prefix: 'assert:FileEquals',
        body: '\\$this->assertFileEquals($${1:expected}, $${2:actual});',
        description: "assertFileEquals(string $expected, string $actual[, string $message = ''])",
        scope: 'source.php',
    },
    assertFileExists: {
        prefix: 'assert:FileExists',
        body: '\\$this->assertFileExists($${1:filename});',
        description: "assertFileExists(string $filename[, string $message = ''])",
        scope: 'source.php',
    },
    assertFileIsReadable: {
        prefix: 'assert:FileIsReadable',
        body: '\\$this->assertFileIsReadable($${1:filename});',
        description: "assertFileIsReadable(string $filename[, string $message = ''])",
        scope: 'source.php',
    },
    assertFileIsWritable: {
        prefix: 'assert:FileIsWritable',
        body: '\\$this->assertFileIsWritable($${1:filename});',
        description: "assertFileIsWritable(string $filename[, string $message = ''])",
        scope: 'source.php',
    },
    assertGreaterThan: {
        prefix: 'assert:GreaterThan',
        body: '\\$this->assertGreaterThan($${1:expected}, $${2:actual});',
        description: "assertGreaterThan(mixed $expected, mixed $actual[, string $message = ''])",
        scope: 'source.php',
    },
    assertGreaterThanOrEqual: {
        prefix: 'assert:GreaterThanOrEqual',
        body: '\\$this->assertGreaterThanOrEqual($${1:expected}, $${2:actual});',
        description: "assertGreaterThanOrEqual(mixed $expected, mixed $actual[, string $message = ''])",
        scope: 'source.php',
    },
    assertInfinite: {
        prefix: 'assert:Infinite',
        body: '\\$this->assertInfinite($${1:variable});',
        description: "assertInfinite(mixed $variable[, string $message = ''])",
        scope: 'source.php',
    },
    assertInstanceOf: {
        prefix: 'assert:InstanceOf',
        body: '\\$this->assertInstanceOf($${1:expected}, $${2:actual});',
        description: "assertInstanceOf($expected, $actual[, $message = ''])",
        scope: 'source.php',
    },
    assertInternalType: {
        prefix: 'assert:InternalType',
        body: '\\$this->assertInternalType($${1:expected}, $${2:actual});',
        description: "assertInternalType($expected, $actual[, $message = ''])",
        scope: 'source.php',
    },
    assertIsReadable: {
        prefix: 'assert:IsReadable',
        body: '\\$this->assertIsReadable($${1:filename});',
        description: "assertIsReadable(string $filename[, string $message = ''])",
        scope: 'source.php',
    },
    assertIsWritable: {
        prefix: 'assert:IsWritable',
        body: '\\$this->assertIsWritable($${1:filename});',
        description: "assertIsWritable(string $filename[, string $message = ''])",
        scope: 'source.php',
    },
    assertJsonFileEqualsJsonFile: {
        prefix: 'assert:JsonFileEqualsJsonFile',
        body: '\\$this->assertJsonFileEqualsJsonFile($${1:expectedFile}, $${2:actualFile});',
        description: "assertJsonFileEqualsJsonFile(mixed $expectedFile, mixed $actualFile[, string $message = ''])",
        scope: 'source.php',
    },
    assertJsonStringEqualsJsonFile: {
        prefix: 'assert:JsonStringEqualsJsonFile',
        body: '\\$this->assertJsonStringEqualsJsonFile($${1:expectedFile}, $${2:actualFile});',
        description: "assertJsonStringEqualsJsonFile(mixed $expectedFile, mixed $actualJson[, string $message = ''])",
        scope: 'source.php',
    },
    assertJsonStringEqualsJsonString: {
        prefix: 'assert:JsonStringEqualsJsonString',
        body: '\\$this->assertJsonStringEqualsJsonString($${1:expectedJson}, $${2:actualJson});',
        description: "assertJsonStringEqualsJsonString(mixed $expectedJson, mixed $actualJson[, string $message = ''])",
        scope: 'source.php',
    },
    assertLessThan: {
        prefix: 'assert:LessThan',
        body: '\\$this->assertLessThan($${1:expected}, $${2:actual});',
        description: "assertLessThan(mixed $expected, mixed $actual[, string $message = ''])",
        scope: 'source.php',
    },
    assertLessThanOrEqual: {
        prefix: 'assert:LessThanOrEqual',
        body: '\\$this->assertLessThanOrEqual($${1:expected}, $${2:actual});',
        description: "assertLessThanOrEqual(mixed $expected, mixed $actual[, string $message = ''])",
        scope: 'source.php',
    },
    assertNan: {
        prefix: 'assert:Nan',
        body: '\\$this->assertNan($${1:variable});',
        description: "assertNan(mixed $variable[, string $message = ''])",
        scope: 'source.php',
    },
    assertNull: {
        prefix: 'assert:Null',
        body: '\\$this->assertNull($${1:variable});',
        description: "assertNull(mixed $variable[, string $message = ''])",
        scope: 'source.php',
    },
    assertObjectHasAttribute: {
        prefix: 'assert:ObjectHasAttribute',
        body: '\\$this->assertObjectHasAttribute($${1:attributeName});',
        description: "assertObjectHasAttribute(string $attributeName, object $object[, string $message = ''])",
        scope: 'source.php',
    },
    assertRegExp: {
        prefix: 'assert:RegExp',
        body: '\\$this->assertRegExp($${1:pattern}, $${1:string});',
        description: "assertRegExp(string $pattern, string $string[, string $message = ''])",
        scope: 'source.php',
    },
    assertStringMatchesFormat: {
        prefix: 'assert:StringMatchesFormat',
        body: '\\$this->assertStringMatchesFormat($${1:format}, $${1:string});',
        description: "assertStringMatchesFormat(string $format, string $string[, string $message = ''])",
        scope: 'source.php',
    },
    assertStringMatchesFormatFile: {
        prefix: 'assert:StringMatchesFormatFile',
        body: '\\$this->assertStringMatchesFormatFile($${1:formatFile}, $${1:string});',
        description: "assertStringMatchesFormatFile(string $formatFile, string $string[, string $message = ''])",
        scope: 'source.php',
    },
    assertSame: {
        prefix: 'assert:Same',
        body: '\\$this->assertSame($${1:expected}, $${2:actual});',
        description: "assertSame(mixed $expected, mixed $actual[, string $message = ''])",
        scope: 'source.php',
    },
    assertStringEndsWith: {
        prefix: 'assert:StringEndsWith',
        body: '\\$this->assertStringEndsWith($${1:suffix}, $${2:string});',
        description: "assertStringEndsWith(string $suffix, string $string[, string $message = ''])",
        scope: 'source.php',
    },
    assertStringEqualsFile: {
        prefix: 'assert:StringEqualsFile',
        body: '\\$this->assertStringEqualsFile($${1:expectedFile}, $${2:actualString});',
        description: "assertStringEqualsFile(string $expectedFile, string $actualString[, string $message = ''])",
        scope: 'source.php',
    },
    assertStringStartsWith: {
        prefix: 'assert:StringStartsWith',
        body: '\\$this->assertStringStartsWith($${1:prefix}, $${2:string});',
        description: "assertStringStartsWith(string $prefix, string $string[, string $message = ''])",
        scope: 'source.php',
    },
    assertThat: {
        prefix: 'assert:That',
        body: '\\$this->assertThat($${1:value}, $${2:constraint});',
        description: "assertThat(mixed $value, PHPUnit_Framework_Constraint $constraint[, $message = ''])",
        scope: 'source.php',
    },
    assertTrue: {
        prefix: 'assert:True',
        body: '\\$this->assertTrue($${1:condition})',
        description: "assertTrue(bool $condition[, string $message = ''])",
        scope: 'source.php',
    },
    assertXmlFileEqualsXmlFile: {
        prefix: 'assert:XmlFileEqualsXmlFile',
        body: '\\$this->assertXmlFileEqualsXmlFile($${1:expectedFile}, $${2:actualFile});',
        description: "assertXmlFileEqualsXmlFile(string $expectedFile, string $actualFile[, string $message = ''])",
        scope: 'source.php',
    },
    assertXmlStringEqualsXmlFile: {
        prefix: 'assert:XmlStringEqualsXmlFile',
        body: '\\$this->assertXmlStringEqualsXmlFile($${1:expectedFile}, $${2:actualXml});',
        description: "assertXmlStringEqualsXmlFile(string $expectedFile, string $actualXml[, string $message = ''])",
        scope: 'source.php',
    },
    assertXmlStringEqualsXmlString: {
        prefix: 'assert:XmlStringEqualsXmlString',
        body: '\\$this->assertXmlStringEqualsXmlString($${1:expectedXml}, $${2:actualXml});',
        description: "assertXmlStringEqualsXmlString(string $expectedXml, string $actualXml[, string $message = ''])",
        scope: 'source.php',
    },

    /* Incomplete & Skipped */
    markTestIncomplete: {
        prefix: 'mark:TestIncomplete',
        body: '\\$this->markTestIncomplete(${1:message});',
        description: "markTestIncomplete([string $message = ''])",
        scope: 'source.php',
    },
    markTestSkipped: {
        prefix: 'mark:TestSkipped',
        body: '\\$this->markTestSkipped(${1:message});',
        description: "markTestSkipped([string $message = ''])",
        scope: 'source.php',
    },

    /* Exceptions */
    expectException: {
        prefix: 'exp:Exception',
        body: '\\$this->expectException(${1:Exception::class});',
        description: 'expectException(ClassName)',
        scope: 'source.php',
    },
    expectExceptionCode: {
        prefix: 'exp:ExceptionCode',
        body: '\\$this->expectExceptionCode(${1:ClassName::CONST});',
        description: 'expectExceptionCode(ClassName::CONST)',
        scope: 'source.php',
    },
    expectExceptionMessage: {
        prefix: 'exp:ExceptionMessage',
        body: '\\$this->expectExceptionMessage(${1:message});',
        description: 'expectExceptionMessage(string $message)',
        scope: 'source.php',
    },
    expectExceptionMessageRegExp: {
        prefix: 'exp:ExceptionMessageRegExp',
        body: '\\$this->expectExceptionMessageRegExp(/$1/);',
        description: 'expectExceptionMessageRegExp(/RegExp/)',
        scope: 'source.php',
    },

    /* TestCase */
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
        ].join('\n'),
        description: 'PHPUnit: test case declaration',
        scope: 'source.php',
    },
    setup: {
        prefix: 'setup',
        body: ['protected function setUp()', '{', '    parent::setUp();', '    ${0:// }', '}', ''].join('\n'),
        description: 'setup',
        scope: 'source.php',
    },
    teardown: {
        prefix: 'teardown',
        body: ['protected function tearDown()', '{', '    parent::tearDown();', '    ${0:// }', '}', ''].join('\n'),
        description: 'teardown',
        scope: 'source.php',
    },
    test: {
        prefix: 'test',
        body: [
            '/** @test */',
            'public function ${1:test_}${2:function}()',
            '{',
            '    ${0:// assertions}',
            '}',
            '',
        ].join('\n'),
        description: 'test',
        scope: 'source.php',
    },
    testex: {
        prefix: 'testex',
        body: [
            '/*',
            ' * @test',
            ' * @expectedException \\Exception',
            '*/',
            'public function ${1:test_}${2:function}()',
            '{',
            '    ${0:// assertions}',
            '}',
            '',
        ].join('\n'),
        description: 'testex',
        scope: 'source.php',
    },
    testi: {
        prefix: 'testi',
        body: [
            '/*',
            ' * @test',
            ' * @expectedException \\Exception',
            '*/',
            'public function ${1:test_}${2:function}()',
            '{',
            "    \\$this->markTestIncomplete('Not yet implemented')",
            '}',
            '',
        ].join('\n'),
        description: 'testi',
        scope: 'source.php',
    },
};

export class Snippets {
    private items: CompletionItem[] = [];

    constructor() {
        for (const name in snippetJson) {
            const snippet: Snippet = snippetJson[name];
            const body: string = snippet.body;
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
