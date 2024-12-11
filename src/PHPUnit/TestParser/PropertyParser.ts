import { Declaration } from 'php-parser';
import { getName } from '../utils';

export class PropertyParser {
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

    parsePosition(declaration: Declaration) {
        const loc = declaration.loc!;
        const start = { line: loc.start.line, character: loc.start.column };
        const end = { line: loc.end.line, character: loc.end.column };

        return { start, end };
    }

    parseName(declaration?: Declaration) {
        return declaration ? getName(declaration) : undefined;
    }

    parseLabel(annotations: any, qualifiedClass: string, method?: string) {
        if (annotations.testdox && annotations.testdox.length > 0) {
            return annotations.testdox[annotations.testdox.length - 1];
        }

        return method ?? qualifiedClass;
    }
}

export const propertyParser = new PropertyParser();
