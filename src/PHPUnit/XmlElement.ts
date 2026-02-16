import { readFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

export class XmlElement {
    constructor(private readonly node: Record<string, unknown>) {}

    static async loadFile(file: string) {
        return XmlElement.load(await readFile(file));
    }

    static load(buffer: string | Buffer | Uint8Array) {
        return new XmlElement(parser.parse(buffer.toString()));
    }

    getAttribute(key: string): string | undefined {
        return (this.node[`@_${key}`] as string) ?? undefined;
    }

    getText(): string {
        if (typeof this.node === 'string') {
            return this.node;
        }

        return this.node['#text'] as string;
    }

    querySelector(selector: string) {
        return this.querySelectorAll(selector)[0] ?? undefined;
    }

    querySelectorAll(selector: string) {
        const segments = selector.split(' ');
        let current: unknown = this.node;
        while (segments.length > 0) {
            const segment = segments.shift();
            if (!segment) {
                break;
            }
            if (Array.isArray(current)) {
                current = current
                    .flatMap((node: Record<string, unknown>) => node[segment] ?? undefined)
                    .filter((node: unknown) => node !== undefined);
            } else {
                current = (current as Record<string, unknown>)[segment] ?? undefined;
            }

            if (current === undefined) {
                return [];
            }
        }

        return this.ensureArray(current).map(
            (node: Record<string, unknown>) => new XmlElement(node),
        );
    }

    private ensureArray(obj: unknown) {
        return Array.isArray(obj) ? obj : [obj];
    }
}
