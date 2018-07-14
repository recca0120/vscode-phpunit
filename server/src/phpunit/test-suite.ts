import { default as Engine } from 'php-parser';
import { Range } from 'vscode-languageserver-types';
import { Method } from './common';
import { Filesystem, Factory as FilesystemFactory } from '../filesystem';
import { tap } from '../support/helpers';

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
            }, [])
            .map((method: Method, _index: number, methods: Method[]) => {
                if (!method.depends) {
                    return method;
                }

                method.depends = this.mergeDepends(method, methods);

                return method;
            });
    }

    private asMethods(classObject: any, uri: string): Method[] {
        const namespace: string = classObject.namespace || '';

        const methods: any[] = classObject.body.filter(this.isTest.bind(this)).map((node: any) => {
            const method: Method = this.asMethod(node, this.namespace(namespace, classObject.name), uri);
            const depends = this.asDepends(node);

            if (depends.length > 0) {
                method.depends = depends;
            }

            return method;
        });

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

    private mergeDepends(method: Method, methods: Method[]) {
        return Array.from(
            methods
                .filter((m: Method) => {
                    return method.depends.indexOf(m.name) !== -1;
                })
                .reduce((depends: Set<string>, m: Method) => {
                    if (m.depends) {
                        m.depends.forEach((depend: string) => depends.add(depend));
                    }

                    return depends.add(m.name);
                }, new Set<string>())
        );
    }

    private asDepends(node: any): string[] {
        return !node.leadingComments
            ? []
            : node.leadingComments.reduce((depends: string[], comment: any) => {
                  const matches: RegExpMatchArray = comment.loc.source.match(/@depends\s+[^\n\s]+/g);

                  if (!matches) {
                      return depends;
                  }

                  return depends.concat(
                      matches.map((depend: string) => depend.replace('@depends', '').trim()).filter(depend => !!depend)
                  );
              }, []);
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
