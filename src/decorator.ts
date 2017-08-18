import { OverviewRulerLane, Range, TextEditor, window } from 'vscode'

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

export class Decorator {
    public types = {
        passed: passed(),
        failed: failed(),
        skipped: skipped(),
        incompleted: skipped(),
    }

    public update(editor: TextEditor, messages: Message[]) {
        for (const type in this.types) {
            editor.setDecorations(this.types[type], [])
        }
        const decorationGroups = {}
        messages.forEach((message: Message) => {
            if (!decorationGroups[message.state]) {
                decorationGroups[message.state] = []
            }
            decorationGroups[message.state].push({
                range: new Range(message.line, 0, message.line, 1),
                hoverMessage: message.state,
            })
        })

        for (const state in decorationGroups) {
            editor.setDecorations(this.types[state], decorationGroups[state])
        }
    }
}
