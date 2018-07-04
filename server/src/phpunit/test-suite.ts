import { default as Engine } from 'php-parser';
import { Range } from 'vscode-languageserver-types';
import { Method } from './common';
import { Filesystem, Factory as FilesystemFactory } from '../filesystem';

export class TestSuite {
    constructor(private files: Filesystem = new FilesystemFactory().create()) {}

    async parseFile(uri: string): Promise<Method[]> {
        return this.parse(await this.files.get(uri), uri);
    }

    parse(code: string, uri: string): Method[] {
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
                return nsOrClass.kind === 'namespace'
                    ? classes.concat(
                          nsOrClass.children.map((classObject: any) => {
                              classObject.namespace = nsOrClass.name;

                              return classObject;
                          })
                      )
                    : classes.concat(nsOrClass);
            }, [])
            .filter((classObject: any) => classObject.kind === 'class' && classObject.isAbstract === false)
            .reduce((methods: any[], classObject: any) => {
                return methods.concat(this.asMethods(classObject, uri));
            }, []);
    }

    private asMethods(classObject: any, uri: string): Method[] {
        const namespace: string = classObject.namespace || '';

        const methods: any[] = classObject.body
            .filter(this.isTest.bind(this))
            .map((node: any) => this.asMethod(node, this.namespace(namespace, classObject.name), uri));

        return methods.length === 0 ? [] : [].concat([this.asMethod(classObject, namespace, uri)], methods);
    }

    private namespace(...name: string[]): string {
        return name.filter(name => !!name).join('\\');
    }

    private asMethod(node: any, namespace: string, uri: string): Method {
        const { start, end } = node.loc;

        return {
            kind: node.kind,
            namespace: namespace,
            name: node.name,
            uri,
            range: Range.create(start.line - 1, start.column, end.line - 1, end.column),
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
