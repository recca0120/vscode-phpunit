import { Message, State, StateKeys } from './parser'

export class Store {
    private items: Map<string, Message[]> = new Map<string, Message[]>()

    public put(messages: Message[]): this {
        this.groupMessageByFile(messages).forEach((messages: Message[], fileName: string) => {
            this.items.set(this.getFileName(fileName), messages)
        })

        return this
    }

    public has(fileName: string): boolean {
        return this.items.has(this.getFileName(fileName))
    }

    public get(fileName: string): Message[] {
        return this.items.get(this.getFileName(fileName))
    }

    public getByState(fileName: string) {
        return this.groupMessageByState(this.get(fileName))
    }

    public forEach(callbackFn) {
        this.items.forEach(callbackFn)
    }

    public dispose() {
        this.items.clear()
    }

    protected getFileName(fileName: string): string {
        return this.removeDriveName(fileName)
    }

    protected groupMessageByFile(messages: Message[]): Map<string, Message[]> {
        return messages.reduce((messageGroup: Map<string, Message[]>, message: Message) => {
            let group = []
            if (messageGroup.has(message.fileName) === true) {
                group = messageGroup.get(message.fileName)
            }

            return messageGroup.set(message.fileName, group.concat(message))
        }, new Map<string, Message[]>())
    }

    protected groupMessageByState(messages: Message[]): Map<State, Message[]> {
        return messages.reduce(
            (messageGroup: Map<State, Message[]>, message: Message) =>
                messageGroup.set(message.state, messageGroup.get(message.state).concat(message)),
            new Map<State, Message[]>([].concat(StateKeys.map(state => [state, []])))
        )
    }

    protected removeDriveName(file): string {
        return file.replace(/^\w:/i, '')
    }
}
