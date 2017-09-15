import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, Range, TextEditor, TextLine, Uri } from 'vscode'
import { Message, State } from './parser'

import { Languages } from './wrapper/vscode'

export class DiagnosticManager {
    private collection: DiagnosticCollection

    public constructor(private languages: Languages = new Languages()) {
        this.collection = this.languages.createDiagnosticCollection('PHPUnit')
    }

    public handle(messagesGroupByFile: Map<string, Message[]>, editor: TextEditor) {
        this.collection.clear()

        messagesGroupByFile.forEach((messages: Message[], file: string) => {
            this.collection.set(Uri.file(file), this.covertToDiagnostic(messages, editor))
        })
    }

    public dispose() {
        this.collection.clear()
        this.collection.dispose()
    }

    protected covertToDiagnostic(messages: Message[], editor: TextEditor): Diagnostic[] {
        return messages.map((message: Message) => {
            return new Diagnostic(
                this.messageToRange(message, editor),
                message.error.fullMessage,
                message.state === State.FAILED ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
            )
        })
    }

    protected messageToRange(message: Message, editor: TextEditor) {
        const textLine: TextLine = editor.document.lineAt(message.lineNumber)

        return new Range(
            textLine.lineNumber,
            textLine.firstNonWhitespaceCharacterIndex,
            textLine.lineNumber,
            textLine.firstNonWhitespaceCharacterIndex + textLine.text.trim().length
        )
    }
}
