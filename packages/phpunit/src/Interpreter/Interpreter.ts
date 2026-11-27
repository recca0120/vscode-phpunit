import type { AstNode } from './AstParser/AstNode';
import { FQNResolver } from './Resolvers/FQNResolver';
import { PestResolver } from './Resolvers/PestResolver';
import { PhpUnitResolver } from './Resolvers/PhpUnitResolver';
import type { FileInfo, Resolver, Visitor } from './types';
import { CallVisitor } from './Visitors/CallVisitor';
import { ClassVisitor } from './Visitors/ClassVisitor';
import { NamespaceVisitor } from './Visitors/NamespaceVisitor';

type Constructor<T> = abstract new (...args: never[]) => T;

export class Interpreter {
    private visitors: Visitor[] = [];
    private resolvers: Resolver[] = [];
    private readonly visitorMap = new Map<Constructor<Visitor>, Visitor>();
    private readonly resolverMap = new Map<Constructor<Resolver>, Resolver>();
    private kindToVisitors = new Map<string, Visitor[]>();

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

    interpret(ast: AstNode): FileInfo {
        for (const v of [...this.visitors, ...this.resolvers]) {
            v.reset?.();
        }
        for (const v of this.visitors) {
            v.initialize?.(this);
        }

        const namespaces = this.getVisitor(NamespaceVisitor);
        for (const section of namespaces.resolveSections(ast)) {
            namespaces.enter(section.scope);
            for (const child of section.children) {
                this.dispatch(child);
            }
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

    static create(): Interpreter {
        const interpreter = new Interpreter();

        interpreter.useVisitor(new NamespaceVisitor());
        interpreter.useVisitor(new ClassVisitor());
        interpreter.useVisitor(new CallVisitor());

        interpreter.useResolver(new FQNResolver());
        interpreter.useResolver(new PhpUnitResolver());
        interpreter.useResolver(new PestResolver());

        return interpreter;
    }

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

const _interpreter = Interpreter.create();
export const interpret = (ast: AstNode): FileInfo => _interpreter.interpret(ast);
