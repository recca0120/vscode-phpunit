import { Program } from 'php-parser';
import Engine from 'php-parser';

export class Ast {
    parse(code: string): any[] {
        return this.getClassMethods(
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
            })
        );
    }

    private getClassMethods(node: Program): any[] {
        return this.getClasses(node).reduce((codeLens: any[], node: any) => {
            const methods: any[] = node.body.filter(this.isTest.bind(this));

            return methods.length === 0 ? codeLens : codeLens.concat([node]).concat(methods);
        }, []);
    }

    private getClasses(node: any) {
        return node.children
            .reduce((classes: any[], namespaceOrClass: any) => {
                return namespaceOrClass.kind === 'namespace'
                    ? classes.concat(namespaceOrClass.children)
                    : classes.concat(namespaceOrClass);
            }, [])
            .filter(this.isTest.bind(this));
    }

    private isTest(node: any): boolean {
        if (node.isAbstract === true) {
            return false;
        }

        if (node.kind === 'class') {
            return true;
        }

        return this.isTestMethod(node) === true;
    }

    private isTestMethod(node: any): boolean {
        return (
            node.kind === 'method' &&
            // /markTest(Skipped|Incomplete)/.test(node.body.loc.source) === false &&
            (/^test/.test(node.name) === true ||
                (node.leadingComments &&
                    node.leadingComments.some((comment: any) => /@test/.test(comment.value)) === true))
        );
    }
}
