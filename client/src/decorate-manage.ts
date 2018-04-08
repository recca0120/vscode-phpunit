import {
    window,
    TextEditorDecorationType,
    OverviewRulerLane,
    ExtensionContext,
    TextEditor,
    Range,
    DecorationOptions,
} from 'vscode';
import { resolve as pathResolve } from 'path';

enum Type {
    PASSED = 'passed',
    ERROR = 'error',
    WARNING = 'warning',
    FAILURE = 'failure',
    INCOMPLETE = 'incomplete',
    RISKY = 'risky',
    SKIPPED = 'skipped',
    FAILED = 'failed',
}

interface Detail {
    file: string;
    line: number;
    range: Range;
}

interface Fault {
    message: string;
    type?: string;
    details?: Detail[];
}

interface Assertion {
    file: string;
    line: number;
    range: Range;
    type: Type;
    fault?: Fault;
}

export class DecorateManager {
    private styles: Map<Type, TextEditorDecorationType>;

    constructor(private context: ExtensionContext, private win = window) {
        this.styles = new Map<Type, TextEditorDecorationType>([
            [Type.PASSED, this.passed()],
            [Type.ERROR, this.error()],
            [Type.WARNING, this.skipped()],
            [Type.FAILURE, this.error()],
            [Type.INCOMPLETE, this.incomplete()],
            [Type.RISKY, this.risky()],
            [Type.SKIPPED, this.skipped()],
            [Type.FAILED, this.error()],
        ]);
    }

    decoratedGutter(editor: TextEditor, assertions: Assertion[]) {
        for (const [type] of this.styles) {
            editor.setDecorations(this.styles.get(type), []);
        }

        for (const [type, decorationOptions] of this.groupBy(assertions)) {
            editor.setDecorations(this.styles.get(type), decorationOptions);
        }
    }

    private groupBy(assertions: Assertion[]): Map<Type, DecorationOptions[]> {
        return assertions.reduce((groups: Map<Type, DecorationOptions[]>, assertion: Assertion) => {
            const group: DecorationOptions[] = groups.get(assertion.type) || [];
            group.push({
                range: new Range(assertion.range.start.line, 0, assertion.range.start.line, 1e3),
                hoverMessage: assertion.fault.message,
            });
            groups.set(assertion.type, group);

            return groups;
        }, new Map<Type, DecorationOptions[]>());
    }

    private passed(): TextEditorDecorationType {
        return this.win.createTextEditorDecorationType({
            overviewRulerColor: 'green',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: this.gutterIconPath('success.svg'),
            },
            dark: {
                gutterIconPath: this.gutterIconPath('success.svg'),
            },
        });
    }

    private error(): TextEditorDecorationType {
        return this.win.createTextEditorDecorationType({
            overviewRulerColor: 'red',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: this.gutterIconPath('danger.svg'),
            },
            dark: {
                gutterIconPath: this.gutterIconPath('danger.svg'),
            },
        });
    }

    private risky(): TextEditorDecorationType {
        return this.win.createTextEditorDecorationType({
            overviewRulerColor: '#ffa0a0',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: this.gutterIconPath('danger-light.svg'),
            },
            dark: {
                gutterIconPath: this.gutterIconPath('danger-light.svg'),
            },
        });
    }

    private skipped(): TextEditorDecorationType {
        return this.win.createTextEditorDecorationType({
            overviewRulerColor: '#d2a032',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: this.gutterIconPath('warning.svg'),
            },
            dark: {
                gutterIconPath: this.gutterIconPath('warning.svg'),
            },
        });
    }

    private incomplete(): TextEditorDecorationType {
        return this.skipped();
    }

    private gutterIconPath(img: string) {
        return pathResolve(this.context.extensionPath, 'images', img);
    }
}
