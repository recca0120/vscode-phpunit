import { relative } from 'path';
import { DocumentLink, Position, Range } from 'vscode';
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
    const normalizePath = (file: string) => relative(root, file).replace(/\\/g, '/');

    const text = `❌ FAILED  Calculator (Tests\Calculator) > Sum item method not call
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
9. ${phpUnitProject('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php')}:19`;

    let provider: PHPUnitLinkProvider;
    beforeEach(() => provider = new PHPUnitLinkProvider());

    it('get links', () => {
        const document = new TextDocument(text);

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
});