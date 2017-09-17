import { Message, State, states } from './parser'
import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode'

import { MessageCollection } from './message-collection'
import { Project } from './project'
import { resolve } from 'path'

export class DecorateManager {
    private styles: Map<State, TextEditorDecorationType>

    public constructor(private project: Project, private decorationStyle: DecorationStyle = new DecorationStyle()) {
        this.styles = states().reduce((styles, state: State) => {
            const style = this.decorationStyle.get(state)

            style.light.gutterIconPath = this.gutterIconPath(style.light.gutterIconPath)
            style.dark.gutterIconPath = this.gutterIconPath(style.dark.gutterIconPath)

            return styles.set(state, this.project.window.createTextEditorDecorationType(style))
        }, new Map<State, TextEditorDecorationType>())
    }

    public decoratedGutter(messageCollection: MessageCollection, editor: TextEditor): void {
        this.clearDecoratedGutter(editor)

        const fileName = editor.document.fileName
        if (messageCollection.has(fileName) === false) {
            return
        }

        messageCollection.getByState(fileName).forEach((messages: Message[], state) => {
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

export class DecorationStyle {
    public get(state: string): any {
        return this[state]()
    }

    public passed(): any {
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

    public failed(): any {
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

    public skipped(): any {
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

    public incompleted(): any {
        return this.skipped()
    }
}
