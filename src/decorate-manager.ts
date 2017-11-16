import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode';
import { Type, TypeMap } from './parsers/parser';
import { normalizePath, tap } from './helpers';

import { Container } from './container';
import { Store } from './store';
import { resolve } from 'path';

export class DecorateManager {
    private styles: Map<Type, TextEditorDecorationType> = new Map<Type, TextEditorDecorationType>();
    private extensionPath: string;
    private window: any;

    constructor(container: Container, private decorationStyle: DecorationStyle = new DecorationStyle()) {
        this.extensionPath = container.extensionPath;
        this.window = container.window;

        TypeMap.forEach((mapTo, key) => {
            this.styles.set(key, this.createTextEditorDecorationType(this.decorationStyle.get(mapTo)));
        });
    }

    decoratedGutter(store: Store, editors: TextEditor[]): this {
        const details = store.getDetails();

        editors.forEach((editor: TextEditor) => {
            const key = normalizePath(editor.document.uri.fsPath);
            const gutters = details.where('key', key);

            if (gutters.count() === 0) {
                return;
            }

            gutters.groupBy('type').forEach((items, type) => {
                editor.setDecorations(
                    this.styles.get(type),
                    items
                        .map(item => ({
                            range: new Range(item.line - 1, 0, item.line - 1, 0),
                            hoverMessage: item.type,
                        }))
                        .all()
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
        return this.window.createTextEditorDecorationType(
            tap(style, () => {
                style.light.gutterIconPath = this.gutterIconPath(style.light.gutterIconPath);
                style.dark.gutterIconPath = this.gutterIconPath(style.dark.gutterIconPath);
            })
        );
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
