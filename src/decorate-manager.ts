import { Message, State, StateKeys } from './parser'
import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode'

import { Project } from './project'
import { Store } from './store'
import { resolve } from 'path'

export class DecorateManager {
    private styles: Map<State, TextEditorDecorationType>

    public constructor(private project: Project, private decorationStyle: DecorationStyle = new DecorationStyle()) {
        const { window } = this.project
        this.styles = StateKeys.reduce((styles, state: State) => {
            return styles.set(
                state,
                window.createTextEditorDecorationType(
                    this.decorationStyle.get(state, style => {
                        style.light.gutterIconPath = this.gutterIconPath(style.light.gutterIconPath)
                        style.dark.gutterIconPath = this.gutterIconPath(style.dark.gutterIconPath)

                        return style
                    })
                )
            )
        }, new Map<State, TextEditorDecorationType>())
    }

    public decoratedGutter(store: Store, editor: TextEditor): void {
        this.clearDecoratedGutter(editor)

        const fileName = editor.document.fileName
        if (store.has(fileName) === false) {
            return
        }

        store.getByState(fileName).forEach((messages: Message[], state) => {
            editor.setDecorations(
                this.styles.get(state),
                messages.map(message => ({
                    range: new Range(message.lineNumber, 0, message.lineNumber, 0),
                    hoverMessage: message.state,
                }))
            )
        })
    }

    private clearDecoratedGutter(editor: TextEditor) {
        for (const state of this.styles.keys()) {
            editor.setDecorations(this.styles.get(state), [])
        }
    }

    private gutterIconPath(img: string) {
        return resolve(this.project.extensionPath, 'images', img)
    }
}

export interface DecorationType {
    overviewRulerColor: string
    overviewRulerLane: OverviewRulerLane
    light: {
        gutterIconPath: string
    }
    dark: {
        gutterIconPath: string
    }
}

export class DecorationStyle {
    public get(state: string, callback: Function = null): DecorationType {
        return callback === null ? this[state]() : callback(this[state]())
    }

    public passed(): DecorationType {
        return {
            overviewRulerColor: 'green',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: 'passed.svg',
            },
            dark: {
                gutterIconPath: 'passed.svg',
            },
        }
    }

    public failed(): DecorationType {
        return {
            overviewRulerColor: 'red',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: 'failed.svg',
            },
            dark: {
                gutterIconPath: 'failed.svg',
            },
        }
    }

    public skipped(): DecorationType {
        return {
            overviewRulerColor: 'darkgrey',
            overviewRulerLane: OverviewRulerLane.Left,
            dark: {
                gutterIconPath: 'skipped.svg',
            },
            light: {
                gutterIconPath: 'skipped.svg',
            },
        }
    }

    public incompleted(): DecorationType {
        return this.skipped()
    }
}
