import type { ClassNode, MethodNode } from '../AstParser/AstNode';
import type { Metadata } from './Metadata';
import type { MetadataParser } from './MetadataParser';

export class MetadataParserChain implements MetadataParser {
    constructor(private parsers: MetadataParser[]) {}

    forClass(node: ClassNode): Metadata[] {
        return this.merge(this.parsers.map((parser) => parser.forClass(node)));
    }

    forMethod(node: MethodNode): Metadata[] {
        return this.merge(this.parsers.map((parser) => parser.forMethod(node)));
    }

    private merge(results: Metadata[][]): Metadata[] {
        const taken = new Set<string>();
        const merged: Metadata[] = [];

        for (const result of results) {
            merged.push(...result.filter((metadata) => !taken.has(overrideKey(metadata))));
            for (const metadata of result) {
                taken.add(overrideKey(metadata));
            }
        }

        return merged;
    }
}

function overrideKey(metadata: Metadata): string {
    if (metadata.kind === 'dependsOnMethod' || metadata.kind === 'dataProvider') {
        return metadata.className ? `${metadata.kind}:external` : metadata.kind;
    }
    return metadata.kind;
}
