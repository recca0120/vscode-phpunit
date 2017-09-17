import { Message, State, StateKeys } from './parser'

export class Store {
    constructor(messages: Message[] = [], private items: Map<string, Message[]> = new Map<string, Message[]>()) {
        this.put(messages)
    }

    put(messages: Message[]): this {
        this.groupByFile(messages).forEach((messages: Message[], fileName: string) => {
            this.items.set(this.getFileName(fileName), messages)
        })

        return this
    }

    keys(): Iterable<string> {
        return this.items.keys()
    }

    has(fileName: string): boolean {
        return this.items.has(this.getFileName(fileName))
    }

    get(fileName: string): Message[] {
        return this.items.get(this.getFileName(fileName))
    }

    getByState(fileName: string): Map<State, Message[]> {
        return this.groupByState(this.get(fileName))
    }

    forEach(callbackFn): void {
        this.items.forEach(callbackFn)
    }

    dispose(): void {
        this.items.clear()
    }

    private getFileName(fileName: string): string {
        return this.removeDriveName(fileName)
    }

    private groupByFile(messages: Message[]): Map<string, Message[]> {
        return messages.reduce((messageGroup: Map<string, Message[]>, message: Message) => {
            let group = []
            if (messageGroup.has(message.fileName) === true) {
                group = messageGroup.get(message.fileName)
            }

            return messageGroup.set(message.fileName, group.concat(message))
        }, new Map<string, Message[]>())
    }

    private groupByState(messages: Message[]): Map<State, Message[]> {
        return messages.reduce(
            (messageGroup: Map<State, Message[]>, message: Message) =>
                messageGroup.set(message.state, messageGroup.get(message.state).concat(message)),
            new Map<State, Message[]>([].concat(StateKeys.map(state => [state, []])))
        )
    }

    private removeDriveName(file): string {
        return file.replace(/^\w:/i, '')
    }
}
