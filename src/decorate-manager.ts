import { Message, State, StateKeys } from './parser'
import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode'

import { Project } from './tester'
import { Store } from './store'
import { resolve } from 'path'

export class DecorateManager {
    private styles: Map<State, TextEditorDecorationType>
    private extensionPath: string
    private window: any

    constructor(project: Project, private decorationStyle: DecorationStyle = new DecorationStyle()) {
        this.extensionPath = project.extensionPath
        this.window = project.window

        this.styles = StateKeys.reduce((styles, state: State) => {
            return styles.set(state, this.createTextEditorDecorationType(this.decorationStyle.get(state)))
        }, new Map<State, TextEditorDecorationType>())
    }

    decoratedGutter(store: Store, editor: TextEditor): this {
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

        return this
    }

    clearDecoratedGutter(editor: TextEditor): this {
        Array.from(this.styles.keys()).forEach(state => editor.setDecorations(this.styles.get(state), []))

        return this
    }

    private createTextEditorDecorationType(style: DecorationType) {
        style.light.gutterIconPath = this.gutterIconPath(style.light.gutterIconPath)
        style.dark.gutterIconPath = this.gutterIconPath(style.dark.gutterIconPath)

        return this.window.createTextEditorDecorationType(style)
    }

    private gutterIconPath(img: string): string {
        return resolve(this.extensionPath, 'images', img)
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
    get(state: string): DecorationType {
        return this[state]()
    }

    passed(): DecorationType {
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

    failed(): DecorationType {
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

    skipped(): DecorationType {
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

    incompleted(): DecorationType {
        return this.skipped()
    }
}
