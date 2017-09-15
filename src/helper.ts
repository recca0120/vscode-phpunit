import { Message, State, stateKeys } from './parser'

export function groupMessageByState(messages: Message[]): Map<State, Message[]> {
    return messages.reduce((
            messageGroup: Map<State, Message[]>, 
            message: Message
        ) => messageGroup.set(message.state, messageGroup.get(message.state).concat(message)),
        new Map<State, Message[]>([].concat(stateKeys().map(state => [state, []]))
    ))
}

export function groupMessageByFile(messages: Message[]): Map<string, Message[]> {
    return messages.reduce((messageGroup: Map<string, Message[]>, message: Message) => {
        let group = []
        if (messageGroup.has(message.fileName) === true) {
            group = messageGroup.get(message.fileName)
        }

        return messageGroup.set(message.fileName, group.concat(message))
    }, new Map<string, Message[]>())
}

export function removeDriveName(file): string {
    return file.replace(/^\w:/i, '')
}

export function pathEquals(source, target): boolean {
    return removeDriveName(source) === removeDriveName(target)
}
