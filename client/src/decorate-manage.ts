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
    private styles: Map<Type, TextEditorDecorationType> = new Map<Type, TextEditorDecorationType>();

    constructor(private context: ExtensionContext, private win = window) {
        const passed: TextEditorDecorationType = this.passed();
        const error: TextEditorDecorationType = this.error();
        const skipped: TextEditorDecorationType = this.skipped();
        const incomplete: TextEditorDecorationType = this.incomplete();
        const risky: TextEditorDecorationType = this.risky();

        this.styles.set(Type.PASSED, passed);
        this.styles.set(Type.ERROR, error);
        this.styles.set(Type.WARNING, skipped);
        this.styles.set(Type.FAILURE, error);
        this.styles.set(Type.INCOMPLETE, incomplete);
        this.styles.set(Type.RISKY, risky);
        this.styles.set(Type.SKIPPED, skipped);
        this.styles.set(Type.FAILED, error);
    }

    decoratedGutter(editor: TextEditor, tests: Test[]): DecorateManager {
        for (const [type, decorationOptions] of this.groupBy(tests)) {
            when(this.styles.get(type), (style: TextEditorDecorationType) => {
                editor.setDecorations(style, decorationOptions);
            });
        }

        return this;
    }

    clearDecoratedGutter(editor: TextEditor): DecorateManager {
        for (const [type] of this.styles) {
            when(this.styles.get(type), (style: TextEditorDecorationType) => {
                editor.setDecorations(style, []);
            });
        }

        return this;
    }

    private groupBy(tests: Test[]): Map<Type, DecorationOptions[]> {
        return tests.reduce((groups: Map<Type, DecorationOptions[]>, assertion: Test) => {
            const group: DecorationOptions[] = groups.get(assertion.type) || [];
            const { start, end } = assertion.range;
            group.push({
                range: new Range(start.line, start.character, end.line, end.character),
                // hoverMessage: assertion.fault ? assertion.fault.type : '',
            });
            groups.set(assertion.type, group);

            return groups;
        }, new Map<Type, DecorationOptions[]>());
    }

    private passed(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('green', 'success.svg');
    }

    private error(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('red', 'danger.svg');
    }

    private risky(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('#ffa0a0', 'danger-light.svg');
    }

    private skipped(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('#d2a032', 'warning.svg');
    }

    private incomplete(): TextEditorDecorationType {
        return this.skipped();
    }

    private gutterIconPath(img: string) {
        return pathResolve(this.context.extensionPath, 'images', img);
    }

    private createTextEditorDecorationType(color: string, image: string) {
        return this.win.createTextEditorDecorationType({
            overviewRulerColor: color,
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: this.gutterIconPath(image),
            },
            dark: {
                gutterIconPath: this.gutterIconPath(image),
            },
        })
    }
}
