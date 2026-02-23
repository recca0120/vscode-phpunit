import type { AstNode } from './AstParser/AstNode';
import { FQNResolver } from './Resolvers/FQNResolver';
import { PestResolver } from './Resolvers/PestResolver';
import { PhpUnitResolver } from './Resolvers/PhpUnitResolver';
import { TestTagResolver } from './Resolvers/TestTagResolver';
import type { FileInfo, Resolver, Visitor } from './types';
import { AttributeVisitor } from './Visitors/AttributeVisitor';
import { CallVisitor } from './Visitors/CallVisitor';
import { ClassVisitor } from './Visitors/ClassVisitor';
import { NamespaceVisitor } from './Visitors/NamespaceVisitor';
import { PhpDocVisitor } from './Visitors/PhpDocVisitor';

type Constructor<T> = abstract new (...args: never[]) => T;

export class PHP {
    private visitors: Visitor[] = [];
    private resolvers: Resolver[] = [];
    private readonly visitorMap = new Map<Constructor<Visitor>, Visitor>();
    private readonly resolverMap = new Map<Constructor<Resolver>, Resolver>();
    private kindToVisitors = new Map<string, Visitor[]>();

    // --- Plugin API ---

    useVisitor(visitor: Visitor): this {
        this.visitors.push(visitor);
        this.visitorMap.set(visitor.constructor as Constructor<Visitor>, visitor);
        for (const kind of visitor.nodeKinds) {
            const list = this.kindToVisitors.get(kind);
            if (list) {
                list.push(visitor);
            } else {
                this.kindToVisitors.set(kind, [visitor]);
            }
        }
        return this;
    }

    getVisitor<T extends Visitor>(type: Constructor<T>): T {
        return this.visitorMap.get(type) as T;
    }

    useResolver(resolver: Resolver): this {
        this.resolvers.push(resolver);
        this.resolverMap.set(resolver.constructor as Constructor<Resolver>, resolver);
        return this;
    }

    getResolver<T extends Resolver>(type: Constructor<T>): T {
        return this.resolverMap.get(type) as T;
    }

    // --- Entry point ---

    interpret(ast: AstNode): FileInfo {
        for (const v of [...this.visitors, ...this.resolvers]) {
            v.reset?.();
        }
        for (const v of this.visitors) {
            v.initialize?.(this);
        }

        const source = this.getVisitor(NamespaceVisitor).resolveSource(ast);

        for (const child of source) {
            this.dispatch(child);
        }

        for (const r of this.resolvers) {
            r.resolve(this);
        }

        const result: Partial<FileInfo> = {
            programRange: ast.loc ?? {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
            },
        };
        for (const r of this.resolvers) {
            r.contribute?.(result, this);
        }
        return result as FileInfo;
    }

    // --- Factory ---

    static create(): PHP {
        const php = new PHP();

        // Visitors
        php.useVisitor(new NamespaceVisitor());
        php.useVisitor(new ClassVisitor());
        php.useVisitor(new PhpDocVisitor());
        php.useVisitor(new AttributeVisitor());
        php.useVisitor(new CallVisitor());

        // Resolvers
        php.useResolver(new TestTagResolver());
        php.useResolver(new FQNResolver());
        php.useResolver(new PhpUnitResolver());
        php.useResolver(new PestResolver());

        // Eagerly initialize so resolver is usable without interpret()
        for (const v of php.visitors) {
            v.initialize?.(php);
        }
        for (const r of php.resolvers) {
            r.resolve(php);
        }

        return php;
    }

    // --- Private ---

    private dispatch(node: AstNode): void {
        const visitors = this.kindToVisitors.get(node.kind);
        if (!visitors) {
            return;
        }
        for (const v of visitors) {
            v.visit(node, this);
        }
    }
}

// --- Module export ---

const _php = PHP.create();
export const interpret = (ast: AstNode): FileInfo => _php.interpret(ast);
