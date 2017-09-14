import {Diagnostic, DiagnosticCollection, Range, TextEditor, TextLine, Uri} from 'vscode'
import {Message, State} from './parser'

import { Languages } from './wrapper/vscode'

export class DiagnosticManager {
    private collection: DiagnosticCollection
    public constructor(
        private languages: Languages = new Languages()
    ) {
        this.collection = this.languages.createDiagnosticCollection('PHPUnit');
    }

    public diagnostic(editor: TextEditor, messageGroup: Map<State, Message[]>) {
        this.collection.clear();

        this.groupMessageByFile(messageGroup.get(State.FAILED)).forEach((messages: Message[], file: string) => {
            this.collection.set(
                Uri.file(file), 
                messages.map((message: Message) => {
                    const textLine: TextLine = editor.document.lineAt(message.lineNumber)

                    return new Diagnostic(
                        new Range(
                            textLine.lineNumber, 
                            textLine.firstNonWhitespaceCharacterIndex, 
                            textLine.lineNumber, 
                            textLine.text.trim().length
                        ),
                        message.error.message
                    )
                }
            ))
        })
    }

    public dispose() {
        this.collection.dispose()
    }

    protected groupMessageByFile(messages: Message[]): Map<string, Message[]> {
        return messages.reduce((messageGroup: Map<string, Message[]>, message: Message) => {
            let group = [];
            if (messageGroup.has(message.file) === true) {
                group = messageGroup.get(message.file)
            }

            return messageGroup.set(
                message.file, 
                group.concat(message)
            );
        }, new Map<string, Message[]>());
    }
}
