import type { Declaration, Method } from 'php-parser';
import type { Annotations } from '../types';
import { lookup } from './AttributeParser';

export { AttributeParser } from './AttributeParser';

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
                        value.replace(/\s*\*\/\s*$/, '').trim(),
                    ];
                }
            }
        }

        return annotations;
    }
}
