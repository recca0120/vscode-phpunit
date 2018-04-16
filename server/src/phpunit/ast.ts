import { default as Engine, Program } from 'php-parser';
import { Range } from 'vscode-languageserver-types';
import { TestNode } from './common';

export class Ast {
    parse(code: string, uri: string): TestNode[] {
        return this.getTestNodes(
            Engine.parseCode(code, {
                ast: {
                    withPositions: true,
                    withSource: true,
                },
                parser: {
                    debug: false,
                    extractDoc: true,
                    suppressErrors: true,
                },
                lexer: {
                    all_tokens: true,
                    comment_tokens: true,
                    mode_eval: true,
                    asp_tags: true,
                    short_tags: true,
                },
            }),
            uri
        );
    }

    getTestNodes(node: Program, uri: string): TestNode[] {
        return node.children.reduce((classes: any[], nsOrClass: any) => {
            const namespace: string = nsOrClass.kind === 'namespace' ? nsOrClass.name : '';

            return (nsOrClass.kind === 'namespace' ? classes.concat(nsOrClass.children) : classes.concat(nsOrClass))
                .filter((o: any) => this.isClass(o))
                .reduce((c: TestNode[], o: any) => c.concat(this.convertToTestNodes(o, uri, namespace)), []);
        }, []);
    }

    private convertToTestNodes(node: any, uri: string, namespace: string): TestNode[] {
        const oClass: string = namespace ? `${namespace}\\${node.name}` : node.name;
        const classname: string = oClass.replace(/\\/g, '.');

        const methods: TestNode[] = node.body
            .filter((method: any) => this.isTestMethod(method))
            .map((method: any) => this.convertToTestNode(method, uri, oClass, classname));

        return methods.length === 0 ? [] : [this.convertToTestNode(node, uri, oClass, classname)].concat(methods);
    }

    private convertToTestNode(node: any, uri: string, oClass: string, classname: string) {
        const { start } = node.loc;

        return {
            class: oClass,
            classname: classname,
            name: node.kind === 'method' ? node.name : oClass,
            uri: uri,
            range: Range.create(start.line - 1, start.column, start.line - 1, start.column + node.name.length),
        };
    }

    private isClass(node: any): boolean {
        return node.kind === 'class' && node.isAbstract === false;
    }

    private isTestMethod(node: any): boolean {
        return (
            node.isAbstract === false &&
            node.kind === 'method' &&
            // /markTest(Skipped|Incomplete)/.test(node.body.loc.source) === false &&
            (/^test/.test(node.name) === true ||
                (node.leadingComments &&
                    node.leadingComments.some((comment: any) => /@test/.test(comment.value)) === true))
        );
    }
}
