import { Declaration, Method } from 'php-parser';
import { Annotations } from '../types';

const lookup = ['depends', 'dataProvider', 'testdox'];

export class AttributeParser {
    public parse(declaration: Declaration) {
        const attributes = this.parseAttributes(declaration);
        const annotations = {} as Annotations;

        for (const property of lookup) {
            const values = attributes
                .filter((attribute: any) => new RegExp(property, 'i').test(attribute.name))
                .map((attribute: any) => attribute.args[0]);

            if (values.length > 0) {
                annotations[property] = values;
            }
        }

        return annotations;
    }

    public isTest(method: Method) {
        return !method.attrGroups
            ? false
            : this.parseAttributes(method).some((attribute: any) => attribute.name === 'Test');
    }

    private parseAttributes(declaration: any): any[] {
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

export class AnnotationParser {
    public parse(declaration: Declaration): Annotations {
        return this.parseComments(declaration);
    }

    public isTest(method: Method) {
        return !method.leadingComments
            ? false
            : new RegExp('@test').test(
                method.leadingComments.map((comment) => comment.value).join('\n'),
            );
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


