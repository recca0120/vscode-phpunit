import * as faker from 'faker'

import { Message, State, StateKeys } from '../src/parser'

import { Store } from '../src/store'
import { resolve } from 'path'

function generatorRandomMessages(num = 10, options: any = {}): Message[] {
    const messages: Message[] = []

    for (let i = 0; i < num; i++) {
        messages.push(
            Object.assign(
                {
                    duration: faker.random.number(),
                    error: {
                        fullMessage: faker.lorem.text(),
                        message: faker.lorem.text(),
                        name: faker.lorem.text(),
                    },
                    fileName: resolve(__dirname, faker.system.commonFileName('php', 'text')),
                    lineNumber: faker.random.number(),
                    state: faker.random.arrayElement(StateKeys),
                    title: faker.lorem.text(),
                },
                options
            )
        )
    }

    return messages
}

describe('Store Tests', () => {
    it('it should group by file name', () => {
        const fileName1: string = resolve(__dirname, faker.system.commonFileName('php', 'text'))
        const fileName2: string = resolve(__dirname, faker.system.commonFileName('php', 'text'))

        const messages1: Message[] = generatorRandomMessages(10, {
            fileName: fileName1,
        })

        const messages2: Message[] = generatorRandomMessages(5, {
            fileName: fileName2,
        })

        const store: Store = new Store()
        store.put(messages1).put(messages2)

        const keys = Array.from(store.keys())

        keys.forEach(key => {
            expect(key).not.toMatch(/^\d{1, 1}:\\/)
        })
        expect(keys.length).toBe(2)
        expect(store.has(fileName1)).toBeTruthy()
        expect(store.get(fileName1)).toEqual(messages1)
        expect(store.has(fileName2)).toBeTruthy()
        expect(store.get(fileName2)).toEqual(messages2)
    })

    it('it should group by state', () => {
        const fileName = resolve(__dirname, faker.system.commonFileName('php', 'text'))
        const messages: Message[] = generatorRandomMessages(10, {
            fileName: fileName,
            state: State.PASSED,
        })
            .concat(
                generatorRandomMessages(5, {
                    fileName: fileName,
                    state: State.FAILED,
                })
            )
            .concat(
                generatorRandomMessages(8, {
                    fileName: fileName,
                    state: State.SKIPPED,
                })
            )
            .concat(
                generatorRandomMessages(6, {
                    fileName: fileName,
                    state: State.INCOMPLETED,
                })
            )

        const store: Store = new Store()
        store.put(messages)

        const groupByState = store.getByState(fileName)

        expect(groupByState.get(State.PASSED).length).toBe(10)
        expect(groupByState.get(State.FAILED).length).toBe(5)
        expect(groupByState.get(State.SKIPPED).length).toBe(8)
        expect(groupByState.get(State.INCOMPLETED).length).toBe(6)
    })

    it('it should execute foreach', () => {
        const items: Map<string, Message[]> = new Map<string, Message[]>()
        const store: Store = new Store([], items)

        spyOn(items, 'forEach')

        const callback: Function = () => {}
        store.forEach(callback)

        expect(items.forEach).toHaveBeenCalledTimes(1)
        expect(items.forEach).toHaveBeenCalledWith(callback)
    })

    it('it should execute clear', () => {
        const items: Map<string, Message[]> = new Map<string, Message[]>()
        const store: Store = new Store([], items)

        spyOn(items, 'clear')
        store.dispose()

        expect(items.clear).toHaveBeenCalledTimes(1)
    })
})
