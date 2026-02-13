import type { AttrGroup, Attribute, Declaration, Method } from 'php-parser';
import type { Annotations } from '../types';

const lookup = ['depends', 'dataProvider', 'testdox', 'group'];

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
        return !method.attrGroups
            ? false
            : this.parseAttributes(method).some(
                  (attribute: ParsedAttribute) => attribute.name === 'Test',
              );
    }

    private parseAttributes(declaration: Declaration): ParsedAttribute[] {
        if (!('attrGroups' in declaration)) {
            return [];
        }

        return (declaration.attrGroups as AttrGroup[]).reduce(
            (attributes: ParsedAttribute[], group: AttrGroup) => {
                return [
                    ...attributes,
                    ...group.attrs.map((attr: Attribute) => {
                        return {
                            name: attr.name,
                            args: attr.args.map((arg: { value?: unknown }) => arg.value),
                        };
                    }),
                ];
            },
            [],
        );
    }
}

export class AnnotationParser {
    public parse(declaration: Declaration): Annotations {
        return this.parseComments(declaration);
    }

    public isTest(method: Method) {
        return !method.leadingComments
            ? false
            : /@test/.test(method.leadingComments.map((comment) => comment.value).join('\n'));
    }

    private readonly template = (annotation: string) =>
        `@${annotation}\\s+(?<${annotation}>[^\\n]+)`;

    private readonly pattern: RegExp = new RegExp(
        lookup.map((name) => this.template(name)).join('|'),
        'ig',
    );

    private parseComments(declaration: Declaration) {
        const comments = declaration.leadingComments ?? [];

        return comments
            .map((comment) => comment.value.matchAll(this.pattern))
            .reduce((result, matches) => this.append(result, matches), {} as Annotations);
    }

    private append(annotations: Annotations, matches: IterableIterator<RegExpMatchArray>) {
        for (const match of matches) {
            const groups = match?.groups;
            for (const property in groups) {
                const value = groups[property];
                if (value) {
                    annotations[property] = [
                        ...((annotations[property] as unknown[] | undefined) ?? []),
                        value.trim(),
                    ];
                }
            }
        }

        return annotations;
    }
}
