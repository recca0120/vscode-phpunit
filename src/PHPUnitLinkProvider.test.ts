import { relative } from 'node:path';
import { DocumentLink, Position, Range } from 'vscode';
import { PHPUnitXML } from './PHPUnit';
import { phpUnitProject } from './PHPUnit/__tests__/utils';
import { PHPUnitLinkProvider } from './PHPUnitLinkProvider';

class TextLine {
    constructor(public text: string, public range: Range) {}
}

class TextDocument {
    private readonly lines: TextLine[];

    constructor(text: string) {
        this.lines = text
            .split('\n')
            .map((line, index) => new TextLine(
                line,
                new Range(new Position(index, 0), new Position(index, text.length))),
            );
    }

    get lineCount() {
        return this.lines.length;
    }

    lineAt(line: number): TextLine {
        return this.lines[line];
    }
}

describe('PHPUnitLinkProvider', () => {
    const root = phpUnitProject('');
    const phpUnitXML = new PHPUnitXML().setRoot(root);
    const normalizePath = (file: string) => {
        return relative(root, file).replace(/\\/g, '/');
    };

    let provider: PHPUnitLinkProvider;
    beforeEach(() => provider = new PHPUnitLinkProvider(phpUnitXML));

    it('get PHPUnit links', () => {
        const document = new TextDocument(`❌ FAILED  Calculator (Tests\Calculator) > Sum item method not call
Mockery\Exception\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called
 exactly 1 times but called 0 times.

1. ${phpUnitProject('vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php')}:32
2. ${phpUnitProject('vendor/mockery/mockery/library/Mockery/Expectation.php')}:739
3. ${phpUnitProject('vendor/mockery/mockery/library/Mockery/ExpectationDirector.php')}:202
4. ${phpUnitProject('vendor/mockery/mockery/library/Mockery/Container.php')}:583
5. ${phpUnitProject('vendor/mockery/mockery/library/Mockery/Container.php')}:519
6. ${phpUnitProject('vendor/mockery/mockery/library/Mockery.php')}:176
7. ${phpUnitProject('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php')}:49
8. ${phpUnitProject('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php')}:61
9. ${phpUnitProject('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php')}:19`);

        const links = (provider.provideDocumentLinks(document as any, {} as any) as DocumentLink[])
            .map((link) => [normalizePath(link.target!.fsPath), link.target!.fragment]);

        expect(links).toEqual([
            ['vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php', 'L32'],
            ['vendor/mockery/mockery/library/Mockery/Expectation.php', 'L739'],
            ['vendor/mockery/mockery/library/Mockery/ExpectationDirector.php', 'L202'],
            ['vendor/mockery/mockery/library/Mockery/Container.php', 'L583'],
            ['vendor/mockery/mockery/library/Mockery/Container.php', 'L519'],
            ['vendor/mockery/mockery/library/Mockery.php', 'L176'],
            ['vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php', 'L49'],
            ['vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php', 'L61'],
            ['vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php', 'L19'],
        ]);
    });

    it('get PEST links', () => {
        const document = new TextDocument(`❌ FAILED  tests/Unit/ArchTest.php > preset  → strict 
Expecting 'src/Calculator.php' to be final.

at src/Calculator.php:7
   3 ▕ namespace App;
   4 ▕ 
   5 ▕ use Exception;
   6 ▕ 
➜  7 ▕ class Calculator
   8 ▕ {
   9 ▕     public function sum($a, $b)
  10 ▕     {
  11 ▕         return $a + $b;
  12 ▕     }

1. src/Calculator.php:7
2. vendor/pestphp/pest-plugin-arch/src/Expectations/Targeted.php:43
3. vendor/pestphp/pest-plugin-arch/src/Blueprint.php:137
4. vendor/pestphp/pest-plugin-arch/src/Expectations/Targeted.php:40
5. vendor/pestphp/pest-plugin-arch/src/SingleArchExpectation.php:156
6. vendor/pestphp/pest-plugin-arch/src/SingleArchExpectation.php:140
7. src/Calculator.php:1
8. vendor/pestphp/pest-plugin-arch/src/Expectations/Targeted.php:43
9. vendor/pestphp/pest-plugin-arch/src/Blueprint.php:137
10. vendor/pestphp/pest-plugin-arch/src/Expectations/Targeted.php:40
11. vendor/pestphp/pest-plugin-arch/src/SingleArchExpectation.php:156
12. vendor/pestphp/pest-plugin-arch/src/SingleArchExpectation.php:140`);

        const links = (provider.provideDocumentLinks(document as any, {} as any) as DocumentLink[])
            .map((link) => [normalizePath(link.target!.fsPath), link.target!.fragment]);

        expect(links).toEqual([
            ['src/Calculator.php', 'L7'],
            ['src/Calculator.php', 'L7'],
            ['vendor/pestphp/pest-plugin-arch/src/Expectations/Targeted.php', 'L43'],
            ['vendor/pestphp/pest-plugin-arch/src/Blueprint.php', 'L137'],
            ['vendor/pestphp/pest-plugin-arch/src/Expectations/Targeted.php', 'L40'],
            ['vendor/pestphp/pest-plugin-arch/src/SingleArchExpectation.php', 'L156'],
            ['vendor/pestphp/pest-plugin-arch/src/SingleArchExpectation.php', 'L140'],
            ['src/Calculator.php', 'L1'],
            ['vendor/pestphp/pest-plugin-arch/src/Expectations/Targeted.php', 'L43'],
            ['vendor/pestphp/pest-plugin-arch/src/Blueprint.php', 'L137'],
            ['vendor/pestphp/pest-plugin-arch/src/Expectations/Targeted.php', 'L40'],
            ['vendor/pestphp/pest-plugin-arch/src/SingleArchExpectation.php', 'L156'],
            ['vendor/pestphp/pest-plugin-arch/src/SingleArchExpectation.php', 'L140'],
        ]);
    });
});