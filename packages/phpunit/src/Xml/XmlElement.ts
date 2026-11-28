import { readFile } from 'node:fs/promises';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

export class XmlParseError extends Error {
    constructor(
        message: string,
        readonly line: number,
    ) {
        super(message);
    }
}

export class XmlElement {
    constructor(private readonly node: Record<string, unknown>) {}

    static async loadFile(file: string) {
        return XmlElement.load(await readFile(file));
    }

    static load(buffer: string | Buffer | Uint8Array) {
        const text = buffer.toString();
        const result = XMLValidator.validate(text);
        if (result !== true) {
            throw new XmlParseError(result.err.msg, result.err.line);
        }

        return new XmlElement(parser.parse(text));
    }

    getAttribute(key: string): string | undefined {
        return (this.node[`@_${key}`] as string) ?? undefined;
    }

    getText(): string | undefined {
        if (typeof this.node === 'string') {
            return this.node;
        }

        return this.node['#text'] as string | undefined;
    }

    querySelector(selector: string) {
        return this.querySelectorAll(selector)[0];
    }

    querySelectorAll(selector: string) {
        const segments = selector.split(' ');
        let current: Record<string, unknown> | Record<string, unknown>[] = this.node;
        for (const segment of segments) {
            if (Array.isArray(current)) {
                current = current
                    .flatMap((node) => node[segment] ?? [])
                    .filter((node): node is Record<string, unknown> => node !== undefined);
            } else {
                const next = current[segment];
                if (next === undefined) {
                    return [];
                }
                current = next as Record<string, unknown> | Record<string, unknown>[];
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
