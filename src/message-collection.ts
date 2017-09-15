import { groupMessageByFile, removeDriveName } from './helper'

import { Message } from './parser'

export class MessageCollection {
    private items: Map<string, Message[]> = new Map<string, Message[]>()

    public put(messages: Message[]): this {
        groupMessageByFile(messages).forEach((messages: Message[], fileName: string) => {
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

    public forEach(callbackFn) {
        this.items.forEach(callbackFn)
    }

    public dispose() {
        this.items.clear()
    }

    protected getFileName(fileName: string): string {
        return removeDriveName(fileName)
    }
}
