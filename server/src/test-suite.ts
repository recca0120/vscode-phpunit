// import { default as Engine } from 'php-parser';
const Engine = require('php-parser');
import { Range } from 'vscode-languageserver-types';
import { Method } from './common';

export class TestSuite {
    parse(code: string, uri: string) {
        return this.getTests(
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

    private getTests(node: any, uri: string): any[] {
        return node.children
            .reduce((classes: any[], nsOrClass: any) => {
                return nsOrClass.kind === 'namespace' ? classes.concat(nsOrClass.children) : classes.concat(nsOrClass);
            }, [])
            .filter((classObject: any) => classObject.kind === 'class' && classObject.isAbstract === false)
            .reduce((methods: any[], classObject: any) => {
                return methods.concat(this.asMethods(classObject, uri));
            }, []);
    }

    private asMethods(classObject: any, uri: string): Method[] {
        const methods: any[] = classObject.body
            .filter(this.isTest.bind(this))
            .map((node: any) => this.asMethod(node, uri));

        return methods.length === 0 ? [] : [].concat([this.asMethod(classObject, uri)], methods);
    }

    private asMethod(node: any, uri: string): Method {
        const { start } = node.loc;

        return {
            kind: node.kind,
            name: node.name,
            uri,
            range: Range.create(start.line - 1, start.column, start.line - 1, start.column + node.name.length),
        };
    }

    private isTest(node: any): boolean {
        return (
            node.isAbstract === false &&
            node.kind === 'method' &&
            ['protected', 'private'].indexOf(node.visibility) === -1 &&
            // /markTest(Skipped|Incomplete)/.test(node.body.loc.source) === false &&
            (/^test/.test(node.name) === true ||
                (node.leadingComments &&
                    node.leadingComments.some((comment: any) => /@test/.test(comment.value)) === true))
        );
    }
}
