import { Program } from 'php-parser';
import Engine from 'php-parser';
const fastXmlParser = require('fast-xml-parser');

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
        return this.getClasses(node)
            .reduce((codeLens: any[], node: any) => {
                const methods: any[] = node.body.filter(this.isTest.bind(this));

                return methods.length === 0 ? codeLens : codeLens.concat([node]).concat(methods);
            }, []);
    }

    private getClasses(node: any) {
        return node.children.reduce((classes: any[], namespaceOrClass: any) => {
            return namespaceOrClass.kind === 'namespace'
                ? classes.concat(namespaceOrClass.children)
                : classes.concat(namespaceOrClass)
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

export enum Type {
    PASSED = 'passed',
    ERROR = 'error',
    WARNING = 'warning',
    FAILURE = 'failure',
    INCOMPLETE = 'incomplete',
    RISKY = 'risky',
    SKIPPED = 'skipped',
    FAILED = 'failed',
}

export interface Test {
    name: string;
    class: string,
    classname: string,
    file: string,
    line: number,
    time: number,
    type: Type,
}

export class JUnit {
    parse(code: string) {
        return this.getTests(
            fastXmlParser.parse(code, {
                attributeNamePrefix: '_',
                ignoreAttributes: false,
                ignoreNameSpace: false,
                parseNodeValue: true,
                parseAttributeValue: true,
                trimValues: true,
                textNodeName: '__text',
            })
        );
    }

    private getSuites(node: any): any[] {
        const testsuites: any = node.testsuites;

        return testsuites.testsuite instanceof Array ? [].concat(testsuites.testsuite) : testsuites.testsuite;
    }

    private getTests(node: any) {
        return this.getSuites(node).reduce((tests: any[], suite: any) => {
            return tests.concat(suite.testcase);
        }, []).map(this.parseTest.bind(this));
    }

    private parseTest(node: any): any {
        const test: any = {
            name: node._name || null,
            class: node._class,
            classname: node._classname || null,
            file: node._file,
            line: parseInt(node._line || 1, 10),
            time: parseFloat(node._time || 0),
            type: Type.PASSED,
        }

        return test;
    }
}

export class Testsuite {
    constructor(private ast: Ast = new Ast()) {}

    parseAst(code: string): any[] {
        return this.ast.parse(code);
    }
}
