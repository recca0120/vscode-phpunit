import {
    window,
    TextEditorDecorationType,
    OverviewRulerLane,
    ExtensionContext,
    TextEditor,
    Range,
    DecorationOptions,
    DecorationRangeBehavior,
    ThemeColor,
} from 'vscode';
import { resolve as pathResolve } from 'path';
import { Type, Test } from './phpunit/common';
import { when } from './helpers';

export class DecorateManager {
    private styles: Map<Type, TextEditorDecorationType> = new Map<Type, TextEditorDecorationType>();

    constructor(private context: ExtensionContext, private win = window) {
        this.styles.set(Type.PASSED, this.passed());
        this.styles.set(Type.ERROR, this.error());
        this.styles.set(Type.WARNING, this.skipped());
        this.styles.set(Type.FAILURE, this.error());
        this.styles.set(Type.INCOMPLETE, this.incomplete());
        this.styles.set(Type.RISKY, this.risky());
        this.styles.set(Type.SKIPPED, this.skipped());
        this.styles.set(Type.FAILED, this.error());
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
                // hoverMessage: assertion.fault ? assertion.fault.message : '',
            });
            groups.set(assertion.type, group);

            return groups;
        }, new Map<Type, DecorationOptions[]>());
    }

    private passed(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('success.svg');
    }

    private error(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('danger.svg');
    }

    private risky(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('danger-light.svg');
    }

    private skipped(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('warning.svg');
    }

    private incomplete(): TextEditorDecorationType {
        return this.skipped();
    }

    private createTextEditorDecorationType(image: string, color?: string | ThemeColor) {
        return this.win.createTextEditorDecorationType({
            isWholeLine: true,
            backgroundColor: color,
            rangeBehavior: DecorationRangeBehavior.OpenClosed,
            overviewRulerLane: OverviewRulerLane.Full,
            gutterIconPath: this.gutterIconPath(image),
        });
    }

    private gutterIconPath(img: string) {
        return pathResolve(this.context.extensionPath, 'images', img);
    }
}
