import type { AstNodeComment, ClassNode, MethodNode } from '../AstParser/AstNode';
import type { CloneMode, Metadata } from './Metadata';
import type { MetadataParser } from './MetadataParser';

const ANNOTATION = /@(?<name>[A-Za-z_-]+)(?:[ \t]+(?<value>.*?))?[ \t]*\r?$/gm;
const GROUP_ALIASES = new Set(['ticket', 'small', 'medium', 'large']);
const CLONE_PREFIXES: [string, CloneMode][] = [
    ['clone ', 'deep'],
    ['!clone ', 'none'],
    ['shallowClone ', 'shallow'],
    ['!shallowClone ', 'none'],
];

export class AnnotationParser implements MetadataParser {
    forClass(node: ClassNode): Metadata[] {
        return this.parse(node.leadingComments);
    }

    forMethod(node: MethodNode): Metadata[] {
        return this.parse(node.leadingComments);
    }

    private parse(comments: AstNodeComment[] = []): Metadata[] {
        return comments.flatMap((comment) => {
            const text = stripDelimiters(comment.value);
            return [...annotations(text), ...testWithRows(text)];
        });
    }
}

function stripDelimiters(comment: string): string {
    return comment
        .replace(/^\s*(\/\*\*?|\/\/|#)/, '')
        .replace(/\*\/\s*$/, '')
        .trim();
}

function annotations(text: string): Metadata[] {
    return [...text.matchAll(ANNOTATION)].flatMap((match) =>
        toMetadata(match.groups?.name ?? '', (match.groups?.value ?? '').trim()),
    );
}

function toMetadata(name: string, value: string): Metadata[] {
    if (name === 'test') {
        return [{ kind: 'test' }];
    }

    const key = name.toLowerCase();
    if (GROUP_ALIASES.has(key)) {
        return [{ kind: 'group', name: key === 'ticket' ? value : key }];
    }
    if (!value) {
        return [];
    }
    if (key === 'group') {
        return [{ kind: 'group', name: value }];
    }
    if (key === 'testdox') {
        return [{ kind: 'testDox', text: value }];
    }
    if (key === 'dataprovider') {
        return [dataProvider(value)];
    }
    if (key === 'depends') {
        return [depends(value)];
    }

    return [];
}

function dataProvider(value: string): Metadata {
    const [className, methodName] = splitTarget(value);
    return { kind: 'dataProvider', className, methodName };
}

function depends(value: string): Metadata {
    const [target, clone] = cloneMode(value);
    const [className, methodName] = splitTarget(target);

    if (className && methodName === 'class') {
        return { kind: 'dependsOnClass', className, clone };
    }

    return { kind: 'dependsOnMethod', className, methodName, clone };
}

function cloneMode(value: string): [string, CloneMode] {
    const prefix = CLONE_PREFIXES.find(([candidate]) => value.startsWith(candidate));
    return prefix ? [value.slice(prefix[0].length), prefix[1]] : [value, 'none'];
}

function splitTarget(value: string): [string | undefined, string] {
    const separator = value.lastIndexOf('::');
    return separator === -1
        ? [undefined, value]
        : [value.slice(0, separator), value.slice(separator + 2)];
}

function testWithRows(text: string): Metadata[] {
    const start = text.indexOf('@testWith');
    if (start === -1) {
        return [];
    }

    const lines = text
        .slice(start + '@testWith'.length)
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*\*?\s*/, ''));
    const rows: Metadata[] = [];
    for (const line of lines) {
        if (!line.startsWith('[')) {
            break;
        }
        rows.push({ kind: 'testWith', data: line });
    }

    return rows;
}
