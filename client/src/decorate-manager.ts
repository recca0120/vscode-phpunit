import { Window } from './wrappers/window';
import { resolve as pathResolve } from 'path';
import {
    ExtensionContext,
    TextEditorDecorationType,
    OverviewRulerLane,
    ThemeColor,
    TextEditor,
    DecorationOptions,
    Range,
} from 'vscode';
import { Type, Test } from './common';
import { LanguageClient } from 'vscode-languageclient';
import { StatusBarManager } from './statusbar-manager';

export class DecorateManager {
    private styles: Map<Type, TextEditorDecorationType> = new Map<Type, TextEditorDecorationType>();

    constructor(
        private client: LanguageClient,
        private context: ExtensionContext,
        private statusBarManager: StatusBarManager,
        private window: Window = new Window()
    ) {
        this.styles.set(Type.PASSED, this.passed());
        this.styles.set(Type.ERROR, this.error());
        this.styles.set(Type.RISKY, this.risky());
        this.styles.set(Type.SKIPPED, this.skipped());
    }

    decoratedGutter(decorationOptionGroup: Map<Type, DecorationOptions[]>) {
        const editor: TextEditor = this.window.activeTextEditor;

        if (!editor) {
            return;
        }

        this.clearDecoratedGutter();

        decorationOptionGroup.forEach((decorationOptions: DecorationOptions[], type: Type) => {
            editor.setDecorations(this.styles.get(type), decorationOptions);
        });
    }

    clearDecoratedGutter() {
        const editor: TextEditor = this.window.activeTextEditor;

        if (!editor) {
            return;
        }

        for (const [type] of this.styles) {
            editor.setDecorations(this.styles.get(type), []);
        }
    }

    listen() {
        this.statusBarManager.listen();

        this.client.onNotification('running', () => {
            this.clearDecoratedGutter();
            this.statusBarManager.running();
        });

        this.client.onNotification('tests', (params: any) => {
            const decorationOptionGroup: Map<Type, DecorationOptions[]> = this.groupBy(params.tests);
            this.decoratedGutter(decorationOptionGroup);

            let decorationOptions: DecorationOptions[] = decorationOptionGroup.get(Type.ERROR) || [];
            if (decorationOptions.length > 0) {
                this.statusBarManager.failed();

                return;
            }

            decorationOptions = decorationOptionGroup.get(Type.SKIPPED) || [];
            if (decorationOptions.length > 0) {
                this.statusBarManager.failed();

                return;
            }

            decorationOptions = decorationOptionGroup.get(Type.PASSED) || [];
            if (decorationOptions.length > 0) {
                this.statusBarManager.success();

                return;
            }

            this.statusBarManager.stopped();
        });
    }

    private groupBy(tests: Test[]): Map<Type, DecorationOptions[]> {
        const decorationOptionGroup: Map<Type, DecorationOptions[]> = new Map<Type, DecorationOptions[]>();

        return tests.reduce((decorationOptionGroup: Map<Type, DecorationOptions[]>, test: Test) => {
            const type: Type = this.getType(test);
            const decorationOptions: DecorationOptions[] = decorationOptionGroup.get(type) || [];

            const { start, end } = test.range;

            decorationOptions.push({
                range: new Range(start.line, start.character, end.line, end.character),
                hoverMessage: test.fault ? test.fault.message : '',
            });

            decorationOptionGroup.set(type, decorationOptions);

            return decorationOptionGroup;
        }, decorationOptionGroup);
    }

    private getType(test: Test): Type {
        if (test.type === Type.PASSED) {
            return Type.PASSED;
        }

        if ([Type.SKIPPED, Type.INCOMPLETE, Type.WARNING].indexOf(test.type) !== -1) {
            return Type.SKIPPED;
        }

        return Type.ERROR;
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

    private createTextEditorDecorationType(image: string, color?: string | ThemeColor): TextEditorDecorationType {
        return this.window.createTextEditorDecorationType({
            overviewRulerColor: color,
            overviewRulerLane: OverviewRulerLane.Left,
            gutterIconPath: this.gutterIconPath(image),
        });
    }

    private gutterIconPath(img: string) {
        console.log(this.context.extensionPath);
        return pathResolve(this.context.extensionPath, 'client', 'images', img);
    }
}
