import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType, window } from 'vscode'

import { Message } from './parser'

export function passed() {
    return window.createTextEditorDecorationType({
        overviewRulerColor: 'green',
        overviewRulerLane: OverviewRulerLane.Left,
        light: {
            before: {
                color: '#3BB26B',
                contentText: '●',
            },
        },
        dark: {
            before: {
                color: '#2F8F51',
                contentText: '●',
            },
        },
    })
}

export function failed() {
    return window.createTextEditorDecorationType({
        overviewRulerColor: 'red',
        overviewRulerLane: OverviewRulerLane.Left,
        light: {
            before: {
                color: '#FF564B',
                contentText: '●',
            },
        },
        dark: {
            before: {
                color: '#AD322D',
                contentText: '●',
            },
        },
    })
}

export function skipped() {
    return window.createTextEditorDecorationType({
        overviewRulerColor: 'darkgrey',
        overviewRulerLane: OverviewRulerLane.Left,
        dark: {
            before: {
                color: '#3BB26B',
                contentText: '○',
            },
        },
        light: {
            before: {
                color: '#2F8F51',
                contentText: '○',
            },
        },
    })
}

export function failingAssertionStyle(text: string) {
    return window.createTextEditorDecorationType({
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

export class DecorateManager {
    public decorationTypes: Map<string, TextEditorDecorationType> = new Map([
        ['passed', passed()],
        ['failed', failed()],
        ['skipped', skipped()],
        ['incompleted', skipped()],
    ])

    public clearDecoratedGutter(editor: TextEditor): this {
        this.decorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, [])
        })

        return this
    }

    public decorateGutter(editor: TextEditor, messages: Message[]): void {
        this.groupBy(messages).forEach((decorations, decorationType) => {
            editor.setDecorations(this.decorationTypes.get(decorationType), decorations)
        })
    }

    protected groupBy(messages: Message[]): Map<string, any> {
        const group = {
            passed: [],
            failed: [],
            skipped: [],
            incompleted: [],
        }

        messages.forEach((message: Message) => {
            group[message.state].push({
                range: new Range(message.line, 0, message.line, 1),
                hoverMessage: message.state,
            })
        })

        return new Map([
            ['passed', group.passed],
            ['failed', group.failed],
            ['skipped', group.skipped],
            ['incompleted', group.incompleted],
        ])
    }
}
