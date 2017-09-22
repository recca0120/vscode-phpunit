import { OverviewRulerLane, Range, TextEditor, TextEditorDecorationType } from 'vscode'
import { TestCase, Type, TypeKeys } from './parser'

import { Project } from './tester'
import { Store } from './store'
import { resolve } from 'path'

export class DecorateManager {
    private styles: Map<Type, TextEditorDecorationType>
    private extensionPath: string
    private window: any

    constructor(project: Project, private decorationStyle: DecorationStyle = new DecorationStyle()) {
        this.extensionPath = project.extensionPath
        this.window = project.window

        this.styles = TypeKeys.reduce((styles, type: Type) => {
            return styles.set(type, this.createTextEditorDecorationType(this.decorationStyle.get(type)))
        }, new Map<Type, TextEditorDecorationType>())
    }

    decoratedGutter(store: Store, editor: TextEditor): this {
        const fileName = editor.document.fileName
        if (store.has(fileName) === false) {
            return
        }

        store.getByType(fileName).forEach((testCases: TestCase[], state) => {
            editor.setDecorations(
                this.styles.get(state),
                testCases.map(testCase => ({
                    range: new Range(testCase.line, 0, testCase.line, 0),
                    hoverMessage: testCase.type,
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
    get(type: Type): DecorationType {
        return this[type]()
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

    error(): DecorationType {
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

    incomplete(): DecorationType {
        return this.skipped()
    }
}
