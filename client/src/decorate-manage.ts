import {
    window,
    TextEditorDecorationType,
    OverviewRulerLane,
    ExtensionContext,
    TextEditor,
    Range,
    DecorationOptions,
    ThemeColor,
} from 'vscode';
import { resolve as pathResolve } from 'path';
import { Type, Test, Assertion } from './phpunit/common';
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

    decoratedGutter(editor: TextEditor, assertions: Assertion[]): DecorateManager {
        this.clearDecoratedGutter(editor);

        for (const [type, decorationOptions] of this.groupBy(assertions)) {
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

    private groupBy(assertions: Assertion[]): Map<Type, DecorationOptions[]> {
        return assertions.reduce((groups: Map<Type, DecorationOptions[]>, assertion: Assertion) => {
            const test: Test = assertion.related;
            const group: DecorationOptions[] = groups.get(test.type) || [];
            const { start, end } = assertion.range;
            const related: Test = assertion.related;
            group.push({
                range: new Range(start.line, start.character, end.line, end.character),
                hoverMessage: related.fault ? related.fault.message : '',
            });
            groups.set(test.type, group);

            return groups;
        }, new Map<Type, DecorationOptions[]>());
    }

    private passed(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('success.svg', '#62b455');
    }

    private error(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('danger.svg', '#fe536a');
    }

    private risky(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('danger-light.svg', '#ffa0a0');
    }

    private skipped(): TextEditorDecorationType {
        return this.createTextEditorDecorationType('warning.svg', '#d2a032');
    }

    private incomplete(): TextEditorDecorationType {
        return this.skipped();
    }

    private createTextEditorDecorationType(image: string, color?: string | ThemeColor): TextEditorDecorationType {
        return this.win.createTextEditorDecorationType({
            overviewRulerColor: color,
            overviewRulerLane: OverviewRulerLane.Left,
            gutterIconPath: this.gutterIconPath(image),
        });
    }

    private gutterIconPath(img: string) {
        return pathResolve(this.context.extensionPath, 'images', img);
    }
}
