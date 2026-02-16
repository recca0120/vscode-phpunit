import type { AttrGroup, Declaration, Method } from 'php-parser';
import type { Annotations } from '../types';

export const lookup = ['depends', 'dataProvider', 'testdox', 'group'];

interface ParsedAttribute {
    name: string;
    args: unknown[];
}

export class AttributeParser {
    public parse(declaration: Declaration) {
        const attributes = this.parseAttributes(declaration);
        const annotations = {} as Annotations;

        for (const property of lookup) {
            const values = attributes
                .filter((attribute: ParsedAttribute) =>
                    new RegExp(property, 'i').test(attribute.name),
                )
                .map((attribute: ParsedAttribute) => attribute.args[0]);

            if (values.length > 0) {
                annotations[property] = values;
            }
        }

        return annotations;
    }

    public isTest(method: Method) {
        if (!method.attrGroups) {
            return false;
        }

        return this.parseAttributes(method).some(
            (attribute: ParsedAttribute) => attribute.name === 'Test',
        );
    }

    private parseAttributes(declaration: Declaration): ParsedAttribute[] {
        if (!('attrGroups' in declaration)) {
            return [];
        }

        const result: ParsedAttribute[] = [];
        for (const group of declaration.attrGroups as AttrGroup[]) {
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
