import { DecorationRenderOptions, OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode';
import { Fault, TestCase, Type } from 'phpunit-editor-support';
import { normalizePath, tap } from './helpers';

import { Container } from './container';
import { Store } from './store';
import { resolve as pathResolve } from 'path';

export const TypeMap = new Map<Type, Type>([
    [Type.PASSED, Type.PASSED],
    [Type.ERROR, Type.ERROR],
    [Type.WARNING, Type.SKIPPED],
    [Type.FAILURE, Type.ERROR],
    [Type.INCOMPLETE, Type.INCOMPLETE],
    [Type.RISKY, Type.RISKY],
    [Type.SKIPPED, Type.SKIPPED],
    [Type.FAILED, Type.ERROR],
]);

export class DecorateManager {
    private styles: Map<Type, TextEditorDecorationType> = new Map<Type, TextEditorDecorationType>();
    private extensionPath: string;
    private window: any;
    private assertions: TextEditorDecorationType[] = [];

    constructor(container: Container, private decorationStyle: DecorationStyle = new DecorationStyle()) {
        this.extensionPath = container.extensionPath;
        this.window = container.window;

        TypeMap.forEach((mapTo, key) => {
            this.styles.set(key, this.createTextEditorDecorationType(this.decorationStyle.create(mapTo)));
        });
    }

    decoratedGutter(store: Store, editors: TextEditor[]): this {
        const details = store.getDetails();

        this.clearAssertions();

        editors.forEach((editor: TextEditor) => {
            const key = normalizePath(editor.document.uri.fsPath);
            const gutters = details.where('key', key);

            if (gutters.count() === 0) {
                return;
            }

            gutters.groupBy('type').forEach((items, type) => {
                editor.setDecorations(
                    this.styles.get(type) as TextEditorDecorationType,
                    items
                        .map((item: TestCase) => ({
                            range: new Range(item.line - 1, 0, item.line - 1, 1e3),
                            hoverMessage: (item.fault as Fault).message,
                        }))
                        .values()
                );
            });

            this.assertions = gutters
                .filter((item: TestCase) => item.type !== Type.PASSED)
                .values()
                .map(item =>
                    tap(
                        this.createTextEditorDecorationType(
                            this.decorationStyle.create('assertion', (item.fault as Fault).message)
                        ),
                        (assertion: TextEditorDecorationType) => {
                            editor.setDecorations(assertion, [
                                {
                                    range: new Range(item.line - 1, 0, item.line - 1, 1e3),
                                },
                            ]);
                        }
                    )
                );
        });

        return this;
    }

    clearDecoratedGutter(editors: TextEditor[]): this {
        editors.forEach((editor: TextEditor) => {
            Array.from(this.styles.keys()).forEach(style =>
                editor.setDecorations(this.styles.get(style) as TextEditorDecorationType, [])
            );
        });

        return this;
    }

    private createTextEditorDecorationType(style: any): TextEditorDecorationType {
        if (style.gutterIconPath) {
            style.gutterIconPath = this.gutterIconPath(style.gutterIconPath);
        }

        if (style.light && style.light.gutterIconPath) {
            style.light.gutterIconPath = this.gutterIconPath(style.light.gutterIconPath);
        }

        if (style.dark && style.dark.gutterIconPath) {
            style.dark.gutterIconPath = this.gutterIconPath(style.dark.gutterIconPath);
        }

        return this.window.createTextEditorDecorationType(style);
    }

    private gutterIconPath(img: string): string {
        return pathResolve(this.extensionPath, 'images', img);
    }

    private clearAssertions() {
        this.assertions.forEach(assertion => {
            assertion.dispose();
        });

        this.assertions = [];
    }
}

export class DecorationStyle {
    create(type: string | Type, text: string = ''): any {
        return (<any>this)[type](text);
    }

    passed(): DecorationRenderOptions {
        return {
            overviewRulerColor: 'green',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: 'success.svg',
            },
            dark: {
                gutterIconPath: 'success.svg',
            },
        };
    }

    error(): DecorationRenderOptions {
        return {
            overviewRulerColor: 'red',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: 'danger.svg',
            },
            dark: {
                gutterIconPath: 'danger.svg',
            },
        };
    }

    risky(): DecorationRenderOptions {
        return {
            overviewRulerColor: '#ffa0a0',
            overviewRulerLane: OverviewRulerLane.Left,
            dark: {
                gutterIconPath: 'danger-light.svg',
            },
            light: {
                gutterIconPath: 'danger-light.svg',
            },
        };
    }

    skipped(): DecorationRenderOptions {
        return {
            overviewRulerColor: '#d2a032',
            overviewRulerLane: OverviewRulerLane.Left,
            dark: {
                gutterIconPath: 'warning.svg',
            },
            light: {
                gutterIconPath: 'warning.svg',
            },
        };
    }

    incomplete(): DecorationRenderOptions {
        return this.skipped();
    }

    assertion(text: string): DecorationRenderOptions {
        return {
            isWholeLine: true,
            overviewRulerColor: 'red',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                before: {
                    color: '#FF564B',
                },
            },
            dark: {
                before: {
                    color: '#AD322D',
                },
            },
            after: {
                contentText: text ? ` // ${text.replace(/\n/g, ' ')}` : '',
            },
        };
    }
}
