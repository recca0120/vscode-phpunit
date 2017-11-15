import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode';
import { TestCase, Type, TypeKeys } from './parsers/parser';

import { Container } from './container';
import { Store } from './store';
import { normalizePath } from './helpers';
import { resolve } from 'path';

export class DecorateManager {
    private styles: Map<Type, TextEditorDecorationType>;
    private extensionPath: string;
    private window: any;

    constructor(container: Container, private decorationStyle: DecorationStyle = new DecorationStyle()) {
        this.extensionPath = container.extensionPath;
        this.window = container.window;

        this.styles = TypeKeys.reduce((styles, type: Type) => {
            return styles.set(type, this.createTextEditorDecorationType(this.decorationStyle.get(type)));
        }, new Map<Type, TextEditorDecorationType>());
    }

    decoratedGutter(store: Store, editors: TextEditor[]): this {
        editors.forEach((editor: TextEditor) => {
            const path = normalizePath(editor.document.uri.fsPath);

            if (store.has(path) === false) {
                return;
            }

            store
                .get(path)
                .groupBy('type')
                .forEach((items: TestCase[], style: Type) => {
                    editor.setDecorations(
                        this.styles.get(style),
                        items.map(item => ({
                            range: new Range(item.line - 1, 0, item.line - 1, 0),
                            hoverMessage: item.type,
                        }))
                    );
                });
        });

        return this;
    }

    clearDecoratedGutter(editors: TextEditor[]): this {
        editors.forEach((editor: TextEditor) => {
            Array.from(this.styles.keys()).forEach(state => editor.setDecorations(this.styles.get(state), []));
        });

        return this;
    }

    private createTextEditorDecorationType(style: DecorationType) {
        style.light.gutterIconPath = this.gutterIconPath(style.light.gutterIconPath);
        style.dark.gutterIconPath = this.gutterIconPath(style.dark.gutterIconPath);

        return this.window.createTextEditorDecorationType(style);
    }

    private gutterIconPath(img: string): string {
        return resolve(this.extensionPath, 'images', img);
    }
}

export interface DecorationType {
    overviewRulerColor: string;
    overviewRulerLane: OverviewRulerLane;
    light: {
        gutterIconPath: string;
    };
    dark: {
        gutterIconPath: string;
    };
}

export class DecorationStyle {
    get(type: Type): DecorationType {
        return this[type]();
    }

    passed(): DecorationType {
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

    error(): DecorationType {
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

    risky(): DecorationType {
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

    skipped(): DecorationType {
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

    incomplete(): DecorationType {
        return this.skipped();
    }
}
