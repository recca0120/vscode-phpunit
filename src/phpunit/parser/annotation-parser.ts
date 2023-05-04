import { Declaration } from 'php-parser';

export class AttributeParser {
    parse(declaration: any): any[] {
        if (!declaration.hasOwnProperty('attrGroups')) {
            return [];
        }

        return declaration.attrGroups.reduce((attributes: any[], group: any) => {
            return [
                ...attributes,
                ...group.attrs.map((attr: any) => {
                    return {
                        name: attr.name,
                        args: attr.args.map((arg: any) => arg.value),
                    };
                }),
            ];
        }, []);
    }
}

const attributeParser = new AttributeParser();

export type Annotations = {
    [p: string]: unknown;
    depends?: string[];
    dataProvider?: string[];
    testdox?: string[];
};

export class AnnotationParser {
    private static attributeParser = new AttributeParser();
    private readonly lookup = ['depends', 'dataProvider', 'testdox'];
    private readonly template = (annotation: string) =>
        `@${annotation}\\s+(?<${annotation}>[^\\n]+)`;

    private readonly pattern: RegExp = new RegExp(
        this.lookup.map((name) => this.template(name)).join('|'),
        'g'
    );

    public parse(declaration: Declaration): Annotations {
        return { ...this.parseComments(declaration), ...this.parseAttributes(declaration) };
    }

    private parseAttributes(declaration: Declaration) {
        const parsed = attributeParser.parse(declaration);
        const annotations = {} as Annotations;

        for (const property of this.lookup) {
            const values = parsed
                .filter((attribute: any) => new RegExp(property, 'i').test(attribute.name))
                .map((attribute: any) => attribute.args[0]);

            if (values.length > 0) {
                annotations[property] = values;
            }
        }

        return annotations;
    }

    private parseComments(declaration: Declaration) {
        const comments = declaration.leadingComments ?? [];

        return comments
            .map((comment) => comment.value.matchAll(this.pattern))
            .reduce((result, matches) => this.append(result, matches), {} as Annotations);
    }

    private append(annotations: Annotations | any, matches: IterableIterator<RegExpMatchArray>) {
        for (let match of matches) {
            const groups = match!.groups;
            for (const property in groups) {
                const value = groups[property];
                if (value) {
                    annotations[property] = [...(annotations[property] ?? []), value.trim()];
                }
            }
        }

        return annotations;
    }
}

export const annotationParser = new AnnotationParser();
