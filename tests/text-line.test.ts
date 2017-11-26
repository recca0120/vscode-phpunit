import { TextLine } from './../src/text-line';
import { TextLineFactory } from '../src/text-line';
import { resolve as pathResolve } from 'path';

describe('TextLine Tests', () => {
    it('search', async () => {
        const textlineFactory = new TextLineFactory();
        const pattern = new RegExp(`public\\s+function\\s+.*\\s*\\(`);
        const textLines: TextLine[] = await textlineFactory.searchFile(
            pathResolve(__dirname, 'fixtures/PHPUnitTest.php'),
            pattern
        );

        expect(textLines[0]).toEqual({
            lineNumber: 12,
            text: '    public function testPassed()',
            range: {
                start: { line: 12, character: 4 },
                end: { line: 12, character: 32 },
            },
            firstNonWhitespaceCharacterIndex: 4,
            isEmptyOrWhitespace: false,
        });

        expect(textLines[1]).toEqual({
            lineNumber: 17,
            text: '    public function testFailed()',
            range: {
                start: { line: 17, character: 4 },
                end: { line: 17, character: 32 },
            },
            firstNonWhitespaceCharacterIndex: 4,
            isEmptyOrWhitespace: false,
        });

        expect(textLines[2]).toEqual({
            lineNumber: 22,
            text: '    public function testSkipped()',
            range: {
                start: { line: 22, character: 4 },
                end: { line: 22, character: 33 },
            },
            firstNonWhitespaceCharacterIndex: 4,
            isEmptyOrWhitespace: false,
        });

        expect(textLines[3]).toEqual({
            lineNumber: 27,
            text: '    public function testIncomplete()',
            range: {
                start: { line: 27, character: 4 },
                end: { line: 27, character: 36 },
            },
            firstNonWhitespaceCharacterIndex: 4,
            isEmptyOrWhitespace: false,
        });

        expect(textLines[4]).toEqual({
            lineNumber: 32,
            text: '    public function testNoAssertions()',
            range: {
                start: { line: 32, character: 4 },
                end: { line: 32, character: 38 },
            },
            firstNonWhitespaceCharacterIndex: 4,
            isEmptyOrWhitespace: false,
        });

        expect(textLines[5]).toEqual({
            lineNumber: 37,
            text: '    public function testAssertNotEquals() {',
            range: {
                start: { line: 37, character: 4 },
                end: { line: 37, character: 43 },
            },
            firstNonWhitespaceCharacterIndex: 4,
            isEmptyOrWhitespace: false,
        });
    });
});
