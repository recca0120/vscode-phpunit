import { Message, State } from './parser'
import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode'

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

    private states: State[] = [State.PASSED, State.FAILED, State.SKIPPED, State.INCOMPLETED]

    public constructor(private decorationStyle: DecorationStyle, private window: Window = new Window()) {
        this.styles = this.states.reduce(
            (styles, state: State) =>
                styles.set(state, this.window.createTextEditorDecorationType(this.decorationStyle.get(state))),
            new Map<State, TextEditorDecorationType>()
        )
    }

    public handle(messages: Message[], editor: TextEditor) {
        this.clearDecoratedGutter(editor)
        this.groupMessageByState(messages).forEach((messages: Message[], state) => {
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

    protected groupMessageByState(messages: Message[]): Map<State, Message[]> {
        return messages.reduce(
            (messageGroup: Map<State, Message[]>, message: Message) =>
                messageGroup.set(message.state, messageGroup.get(message.state).concat(message)),
            new Map<State, Message[]>([].concat(this.states.map(state => [state, []])))
        )
    }
}
