import { Class, Declaration, Namespace } from 'php-parser';
import { getName } from '../utils';
import { parse as parseAnnotation } from './AnnotationParser';
import { TestDefinition } from './TestParser';

export class PropertyParser {
    private readonly lookup: { [p: string]: Function } = {
        namespace: this.parseNamespace,
        class: this.parseClass,
        method: this.parseMethod,
    };

    public uniqueId(namespace?: string, clazz?: string, method?: string) {
        if (!clazz) {
            return namespace;
        }

        let uniqueId = this.qualifiedClass(namespace, clazz);
        if (method) {
            uniqueId = `${uniqueId}::${method}`;
        }

        return uniqueId;
    }

    public qualifiedClass(namespace?: string, clazz?: string) {
        return [namespace, clazz].filter((name) => !!name).join('\\');
    }

    public parse(declaration: Declaration, namespace?: Namespace, clazz?: Class): TestDefinition {
        const fn = this.lookup[declaration.kind];
        const parsed = fn.apply(this, [declaration, namespace, clazz]);
        const annotations = parseAnnotation(declaration);
        const { start, end } = this.parsePosition(declaration);
        const id = this.uniqueId(parsed.namespace, parsed.class, parsed.method);
        const qualifiedClass = this.qualifiedClass(parsed.namespace, parsed.class);
        const label = this.parseLabel(annotations, parsed.class, parsed.method);

        return { id, qualifiedClass, ...parsed, start, end, annotations, label };
    }

    private parseNamespace(declaration: Declaration) {
        return { namespace: this.parseName(declaration) ?? '' };
    }

    private parseClass(declaration: Declaration, namespace?: Namespace & Declaration) {
        return { namespace: this.parseName(namespace) ?? '', class: this.parseName(declaration) };
    }

    private parseMethod(declaration: Declaration, namespace?: Namespace & Declaration, clazz?: Class) {
        return {
            namespace: this.parseName(namespace) ?? '',
            class: this.parseName(clazz),
            method: this.parseName(declaration),
        };
    }

    private parsePosition(declaration: Declaration) {
        const loc = declaration.loc!;
        const start = { line: loc.start.line, character: loc.start.column };
        const end = { line: loc.end.line, character: loc.end.column };

        return { start, end };
    }

    private parseName(declaration?: Declaration) {
        return declaration ? getName(declaration) : undefined;
    }

    private parseLabel(annotations: any, qualifiedClass: string, method?: string) {
        if (annotations.testdox && annotations.testdox.length > 0) {
            return annotations.testdox[annotations.testdox.length - 1];
        }

        return method ?? qualifiedClass;
    }
}

export const propertyParser = new PropertyParser();
