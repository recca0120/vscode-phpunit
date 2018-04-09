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
import { Type, Test } from './phpunit/common';
import { when } from './helpers';

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

    decoratedGutter(editor: TextEditor, tests: Test[]): DecorateManager {
        for (const [type, decorationOptions] of this.groupBy(tests)) {
            when(this.styles.get(type), (style: TextEditorDecorationType) => {
                editor.setDecorations(style, decorationOptions);
            })
        }

        return this;
    }

    clearDecoratedGutter(editor: TextEditor): DecorateManager {
        for (const [type] of this.styles) {
            when(this.styles.get(type), (style: TextEditorDecorationType) => {
                editor.setDecorations(style, []);
            })
        }

        return this;
    }

    private groupBy(tests: Test[]): Map<Type, DecorationOptions[]> {
        return tests.reduce((groups: Map<Type, DecorationOptions[]>, assertion: Test) => {
            const group: DecorationOptions[] = groups.get(assertion.type) || [];
            const { start, end } = assertion.range;
            group.push({
                range: new Range(start.line, start.character, end.line, end.character),
                hoverMessage: assertion.fault ? assertion.fault.message : '',
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
