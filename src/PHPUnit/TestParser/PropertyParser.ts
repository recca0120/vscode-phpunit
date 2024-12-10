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

    uniqueId(namespace?: string, clazz?: string, method?: string) {
        if (!clazz) {
            return namespace;
        }

        let uniqueId = this.qualifiedClass(namespace, clazz);
        if (method) {
            uniqueId = `${uniqueId}::${method}`;
        }

        return uniqueId;
    }

    qualifiedClass(namespace?: string, clazz?: string) {
        return [namespace, clazz].filter((name) => !!name).join('\\');
    }

    parse(declaration: Declaration, namespace?: Namespace, clazz?: Class): TestDefinition {
        const callback = this.lookup[declaration.kind];
        const result = callback.apply(this, [declaration, namespace, clazz]);
        const annotations = parseAnnotation(declaration);
        const { start, end } = this.parsePosition(declaration);
        const id = this.uniqueId(result.namespace, result.class, result.method);
        const qualifiedClass = this.qualifiedClass(result.namespace, result.class);
        const label = this.parseLabel(annotations, result.class, result.method);

        return { id, qualifiedClass, ...result, start, end, annotations, label };
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
