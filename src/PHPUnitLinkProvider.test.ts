import { DocumentLink, Position, Range } from 'vscode';
import { URI } from 'vscode-uri';
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

    const formatTarget = (uri: URI) => {
        return `${uri.fsPath}:${uri.fragment.replace(/^L/, '')}`;
    };

    let provider: PHPUnitLinkProvider;
    beforeEach(() => provider = new PHPUnitLinkProvider());

    it('get links', () => {
        const document = new TextDocument(text);

        const links = provider.provideDocumentLinks(document as any, {} as any) as DocumentLink[];

        expect(links.map((link) => formatTarget(link.target!))).toEqual([
            `${phpUnitProject('vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php')}:32`,
            `${phpUnitProject('vendor/mockery/mockery/library/Mockery/Expectation.php')}:739`,
            `${phpUnitProject('vendor/mockery/mockery/library/Mockery/ExpectationDirector.php')}:202`,
            `${phpUnitProject('vendor/mockery/mockery/library/Mockery/Container.php')}:583`,
            `${phpUnitProject('vendor/mockery/mockery/library/Mockery/Container.php')}:519`,
            `${phpUnitProject('vendor/mockery/mockery/library/Mockery.php')}:176`,
            `${phpUnitProject('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php')}:49`,
            `${phpUnitProject('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php')}:61`,
            `${phpUnitProject('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php')}:19`,
        ]);
    });
});