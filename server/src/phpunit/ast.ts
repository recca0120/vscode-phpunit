import { Program } from 'php-parser';
import Engine from 'php-parser';
import { Range } from 'vscode-languageserver';
import { TestNode } from './common';
import { FilesystemContract, Filesystem } from '../filesystem';

export class Ast {
    constructor(private files: FilesystemContract = new Filesystem) {}

    parse(code: string, uri: string): any[] {
        return this.getToTestNodes(
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
            this.files.uri(uri)
        );
    }

    getToTestNodes(node: Program, uri: string): TestNode[] {
        return node.children.reduce((classes: any[], namespaceOrClass: any) => {
            const namespace: string = namespaceOrClass.kind === 'namespace' ? namespaceOrClass.name : '';
            return (namespaceOrClass.kind === 'namespace'
                ? classes.concat(namespaceOrClass.children)
                : classes.concat(namespaceOrClass)
            )
                .filter((o: any) => this.isClass(o))
                .reduce((c: TestNode[], o: any) => c.concat(this.convertToTestNodes(o, uri, namespace)), []);
        }, []);
    }

    private convertToTestNodes(node: any, uri: string, namespace: string): TestNode[] {
        const oClass: string = namespace ? `${namespace}\\${node.name}` : node.name;
        const classname: string = oClass.replace(/\\/g, '.');

        return [this.convertToTestNode(node, uri, oClass, classname)].concat(
            node.body
                .filter((method: any) => this.isTestMethod(method))
                .map((method: any) => this.convertToTestNode(method, uri, oClass, classname))
        );
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
