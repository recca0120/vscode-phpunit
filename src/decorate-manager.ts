import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode'

import { Message } from './parser'
import { Window } from './wrapper/vscode'
import { join } from 'path'

export class Decorations {
    public constructor(private window: Window = new Window()) {}
    
    public passed(): TextEditorDecorationType {
        return this.window.createTextEditorDecorationType({
            overviewRulerColor: 'green',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: this.gutterIconPath('passed.svg'),
            },
            dark: {
                gutterIconPath: this.gutterIconPath('passed.svg'), 
            },
        })
    }

    public failed(): TextEditorDecorationType {
        return this.window.createTextEditorDecorationType({
            overviewRulerColor: 'red',
            overviewRulerLane: OverviewRulerLane.Left,
            light: {
                gutterIconPath: this.gutterIconPath('failed.svg'),
            },
            dark: {
                gutterIconPath: this.gutterIconPath('failed.svg'), 
            },
        })
    }

    public skipped(): TextEditorDecorationType {
        return this.window.createTextEditorDecorationType({
            overviewRulerColor: 'darkgrey',
            overviewRulerLane: OverviewRulerLane.Left,
            dark: {
                gutterIconPath: this.gutterIconPath('skipped.svg'),
            },
            light: {
                gutterIconPath: this.gutterIconPath('skipped.svg'), 
            },
        })
    }

    public incompleted(): TextEditorDecorationType {
        return this.skipped()
    }

    public assertionFailed(text: string) {
        return this.window.createTextEditorDecorationType({
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
                contentText: ' // ' + text,
            },
        })
    }

    protected gutterIconPath(path: string) {
        return join(...[__dirname, '/../../images', path]);
    }
}

export class DecorateManager {
    private assertionFails = []

    public decorationTypes: Map<string, TextEditorDecorationType>

    public constructor(private decorations: Decorations = new Decorations()) {
        this.decorationTypes = new Map([
            ['passed', this.decorations.passed()],
            ['failed', this.decorations.failed()],
            ['skipped', this.decorations.skipped()],
            ['incompleted', this.decorations.incompleted()],
        ])
    }

    public clearDecoratedGutter(editor: TextEditor): this {
        this.decorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, [])
        })

        return this
    }

    public decorateGutter(editor: TextEditor, messages: Message[]): void {
        const groupBy = this.groupBy(messages)
        groupBy.forEach((messages: Message[], decorationType: string) => {
            editor.setDecorations(
                this.decorationTypes.get(decorationType),
                messages.map(message => {
                    return {
                        range: new Range(message.line, 0, message.line, 0),
                        hoverMessage: message.state,
                    }
                })
            )
        })

        this.assertionFails.forEach(style => editor.setDecorations(style, []))
        this.assertionFails = []

        groupBy.get('failed').forEach((message: Message) => {
            const decoration = {
                range: new Range(message.line, 0, message.line, 0),
                hoverMessage: message.error.message,
            }
            const style = this.decorations.assertionFailed(message.error.message)
            this.assertionFails.push(style)
            editor.setDecorations(style, [decoration])
        })
    }

    protected groupBy(messages: Message[]): Map<string, Message[]> {
        const group = {
            passed: [],
            failed: [],
            skipped: [],
            incompleted: [],
        }

        messages.forEach((message: Message) => {
            group[message.state].push(message)
        })

        return new Map([
            ['passed', group.passed],
            ['failed', group.failed],
            ['skipped', group.skipped],
            ['incompleted', group.incompleted],
        ])
    }
}
