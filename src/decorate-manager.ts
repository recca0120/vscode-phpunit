import { Message, State, stateGroup } from './parser'
import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode'
import { groupMessageByState, removeDriveName } from './helper'

import { Window } from './wrapper/vscode'

export class DecorationStyle {
    public constructor(private extensionPath: string = '') {}

    public get(state: string): Object {
        return this[state]()
    }

    public passed(): Object {
        const gutterIconPath = this.gutterIconPath('passed.svg')

        return {
            overviewRulerColor: 'green',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: gutterIconPath,
            },
            dark: {
                gutterIconPath: gutterIconPath,
            },
        }
    }

    public failed(): Object {
        const gutterIconPath = this.gutterIconPath('failed.svg')

        return {
            overviewRulerColor: 'red',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: gutterIconPath,
            },
            dark: {
                gutterIconPath: gutterIconPath,
            },
        }
    }

    public skipped(): Object {
        const gutterIconPath = this.gutterIconPath('skipped.svg')

        return {
            overviewRulerColor: 'darkgrey',
            overviewRulerLane: OverviewRulerLane.Left,
            dark: {
                gutterIconPath: gutterIconPath,
            },
            light: {
                gutterIconPath: gutterIconPath,
            },
        }
    }

    public incompleted(): Object {
        return this.skipped()
    }

    private gutterIconPath(img: string) {
        return `${this.extensionPath}/images/${img}`
    }
}

export class DecorateManager {
    private styles: Map<State, TextEditorDecorationType>

    public constructor(private decorationStyle: DecorationStyle, private window: Window = new Window()) {
        this.styles = stateGroup().reduce(
            (styles, state: State) =>
                styles.set(state, this.window.createTextEditorDecorationType(this.decorationStyle.get(state))),
            new Map<State, TextEditorDecorationType>()
        )
    }

    public handle(messagesGroupByFile: Map<string, Message[]>, editor: TextEditor): void {
        this.clearDecoratedGutter(editor)

        const fileName = removeDriveName(editor.document.fileName)

        if (messagesGroupByFile.has(fileName) === false) {
            return
        }

        groupMessageByState(messagesGroupByFile.get(fileName)).forEach((messages: Message[], state) => {
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
}
