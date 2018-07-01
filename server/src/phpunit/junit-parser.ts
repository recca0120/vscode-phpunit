import { parse } from 'fast-xml-parser';
import { tap } from '../support/helpers';
import { Type, Test, Detail } from './common';

export class JUnitParser {
    private pathPattern: RegExp = /(.*):(\d+)$/;

    parse(contents: string): Test[] {
        return this.flatNodes(
            parse(contents, {
                attributeNamePrefix: '_',
                ignoreAttributes: false,
                ignoreNameSpace: false,
                parseNodeValue: true,
                parseAttributeValue: true,
                trimValues: true,
                textNodeName: '__text',
            })
        ).map(this.parseTest.bind(this));
    }

    private flatNodes(node: any): any[] {
        if (node.testsuites) {
            return this.flatNodes(node.testsuites);
        }

        const nodes: any[] = [];

        if (node.testcase) {
            nodes.push(...this.ensureArray(node.testcase));
        }

        if (node.testsuite) {
            nodes.push(
                ...this.ensureArray(node.testsuite).reduce((nodes: any[], testsuite: any) => {
                    return nodes.concat(this.flatNodes(testsuite));
                }, [])
            );
        }

        return nodes;
    }

    private ensureArray(nodes: any): any[] {
        return nodes instanceof Array ? nodes : [nodes];
    }

    private parseTest(node: any): Test {
        return this.parseFault(
            {
                name: node._name || '',
                class: node._class,
                classname: node._classname || '',
                time: parseFloat(node._time) || 0,
                type: Type.PASSED,
                line: node._line || 0,
                file: node._file || '',
            },
            node
        );
    }

    private parseFault(test: Test, node: any): Test {
        const fault = this.getFault(node);

        if (!fault) {
            return test;
        }

        return Object.assign(test, {
            type: fault.type,
            fault: {
                type: fault._type || '',
                message: this.parseMessage(fault),
                details: this.parseDetails(fault),
            },
        });
    }

    private parseMessage(fault: any): string {
        const lines: string[] = fault.__text
            .replace(/\r?\n/g, '\n')
            .replace(/&#13;/g, '')
            .split('\n')
            .map((line: string) => line.replace(this.pathPattern, ''));

        return lines.join('\n').trim();
    }

    private parseDetails(fault: any): Detail[] {
        return fault.__text
            .split(/\r?\n/)
            .map((line: string) => line.trim())
            .filter((line: string) => this.pathPattern.test(line))
            .map((detail: string) => {
                const [, file, line] = detail.match(this.pathPattern) as string[];

                return { file, line: parseInt(line, 10) };
            });
    }

    private getFault(node: any): any {
        const keys: string[] = Object.keys(node);

        if (keys.indexOf('error') !== -1) {
            return tap(node.error, (fault: any) => (fault.type = this.parseErrorType(fault)));
        }

        if (keys.indexOf('warning') !== -1) {
            return tap(node.warning, (fault: any) => (fault.type = Type.WARNING));
        }

        if (keys.indexOf('failure') !== -1) {
            return tap(node.failure, (fault: any) => (fault.type = Type.FAILURE));
        }

        if (keys.indexOf('skipped') !== -1) {
            return {
                type: Type.SKIPPED,
                _type: 'PHPUnit\\Framework\\SkippedTestError',
                __text: 'Skipped Test',
            };
        }

        if (keys.indexOf('incomplete') !== -1) {
            return {
                type: Type.INCOMPLETE,
                _type: 'PHPUnit\\Framework\\IncompleteTestError',
                __text: 'Incomplete Test',
            };
        }

        return;
    }

    private parseErrorType(fault: any): Type {
        const type = fault._type.toLowerCase();

        return (
            [Type.WARNING, Type.FAILURE, Type.INCOMPLETE, Type.RISKY, Type.SKIPPED, Type.FAILED].find(
                errorType => type.indexOf(errorType) !== -1
            ) || Type.ERROR
        );
    }
}
