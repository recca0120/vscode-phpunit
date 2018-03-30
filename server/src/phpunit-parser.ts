import { Program } from 'php-parser';
import Engine from 'php-parser';

const parser: Engine = new Engine({
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
});

export class PhpUnitParser {
    parseCode(code: string): any {
        return this.getNodes(parser.parseCode(code));
    }

    private getNodes(phpNode: Program): any[] {
        return phpNode.children
            .reduce(
                (childrens: any[], children: any) => {
                    return children.kind === 'namespace'
                        ? childrens.concat(children.children)
                        : childrens.concat(children);
                },
                [] as any
            )
            .filter(this.isTest.bind(this))
            .reduce((codeLens: any[], classNode: any) => {
                const methods: any[] = classNode.body.filter(this.isTest.bind(this));

                return methods.length === 0 ? codeLens : codeLens.concat([classNode]).concat(methods);
            }, []);
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
