import type { Annotations } from '../types';
import { lookup } from './AnnotationParser';
import type { ClassNode, MethodNode } from './AstNode';

interface ParsedAttribute {
    name: string;
    args: unknown[];
}

type Annotatable = ClassNode | MethodNode;

export class AttributeParser {
    private readonly lookupPatterns = new Map(
        lookup.map((name) => [name, new RegExp(name, 'i')] as const),
    );

    public parse(declaration: Annotatable) {
        const attributes = this.parseAttributes(declaration);
        const annotations = {} as Annotations;

        for (const [property, pattern] of this.lookupPatterns) {
            const values = attributes
                .filter((attr) => pattern.test(attr.name))
                .map((attr) => attr.args[0]);

            if (values.length > 0) {
                annotations[property] = values;
            }
        }

        return annotations;
    }

    public isTest(method: Annotatable) {
        if (!method.attrGroups) {
            return false;
        }

        return this.parseAttributes(method).some(
            (attribute: ParsedAttribute) => attribute.name === 'Test',
        );
    }

    private parseAttributes(declaration: Annotatable): ParsedAttribute[] {
        if (!declaration.attrGroups) {
            return [];
        }

        const result: ParsedAttribute[] = [];
        for (const group of declaration.attrGroups) {
            for (const attr of group.attrs) {
                result.push({
                    name: attr.name,
                    args: attr.args.map((arg: { value?: unknown }) => arg.value),
                });
            }
        }
        return result;
    }
}
