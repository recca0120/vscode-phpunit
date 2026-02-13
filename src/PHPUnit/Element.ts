import { XMLParser } from 'fast-xml-parser';
import { readFile } from 'node:fs/promises';

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

export class Element {
    constructor(private readonly node: any) {}

    static async loadFile(file: string) {
        return Element.load(await readFile(file));
    }

    static load(buffer: string | Buffer | Uint8Array) {
        return new Element(parser.parse(buffer.toString()));
    }

    getAttribute(key: string) {
        return this.node[`@_${key}`] ?? undefined;
    }

    getText() {
        if (typeof this.node === 'string') {
            return this.node;
        }

        return this.node['#text'];
    }

    querySelector(selector: string) {
        return this.querySelectorAll(selector)[0] ?? undefined;
    }

    querySelectorAll(selector: string) {
        const segments = selector.split(' ');
        let current = this.node;
        while (segments.length > 0) {
            const segment = segments.shift()!;
            if (Array.isArray(current)) {
                current = current.flatMap((node) => node[segment] ?? undefined).filter((node) => node !== undefined);
            } else {
                current = current[segment] ?? undefined;
            }

            if (current === undefined) {
                return [];
            }
        }

        return this.ensureArray(current).map((node) => new Element(node));
    }

    private ensureArray(obj: any) {
        return Array.isArray(obj) ? obj : [obj];
    }
}