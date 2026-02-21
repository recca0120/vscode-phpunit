import type { Annotations } from '../types';
import type { ClassNode, MethodNode } from './AstNode';

export const lookup = ['depends', 'dataProvider', 'testdox', 'group'];

type Annotatable = ClassNode | MethodNode;

export class AnnotationParser {
    public parse(declaration: Annotatable): Annotations {
        return this.parseComments(declaration);
    }

    public isTest(method: Annotatable) {
        return /@test/.test((method.leadingComments ?? []).map((c) => c.value).join('\n'));
    }

    private readonly template = (annotation: string) =>
        `@${annotation}\\s+(?<${annotation}>[^\\n]+)`;

    private readonly pattern: RegExp = new RegExp(
        lookup.map((name) => this.template(name)).join('|'),
        'ig',
    );

    private parseComments(declaration: Annotatable) {
        const comments = declaration.leadingComments ?? [];
        const annotations = {} as Annotations;
        for (const comment of comments) {
            this.append(annotations, comment.value.matchAll(this.pattern));
        }
        return annotations;
    }

    private append(annotations: Annotations, matches: IterableIterator<RegExpMatchArray>): void {
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
    }
}
