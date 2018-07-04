import { parse } from 'fast-xml-parser';
import { tap } from '../support/helpers';
import { Type, Test, Detail, Fault } from './common';
import { decode } from 'he';
import { Textline } from '../support/textline';

export class JUnitParser {
    private pathPattern: RegExp = /(.*):(\d+)$/;

    constructor(private textline: Textline = new Textline()) {}

    async parse(contents: string): Promise<Test[]> {
        return await Promise.all(
            this.flatNodes(
                parse(contents, {
                    attributeNamePrefix: '_',
                    ignoreAttributes: false,
                    ignoreNameSpace: false,
                    parseNodeValue: true,
                    parseAttributeValue: true,
                    trimValues: true,
                    textNodeName: '__text',
                })
            ).map((test: any) => this.parseTest(test))
        );
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

    private async parseTest(node: any): Promise<Test> {
        return await this.createRange(
            await this.parseFault(
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
            )
        );
    }

    private async parseFault(test: any, node: any): Promise<Fault> {
        const fault = this.getFault(node);

        if (!fault) {
            return test;
        }

        return Object.assign(test, {
            type: fault.type,
            fault: {
                type: fault._type || '',
                message: this.parseMessage(fault),
                details: await this.parseDetails(fault),
            },
        });
    }

    private parseMessage(fault: any): string {
        const lines: string[] = fault.__text
            .replace(/\r?\n/g, '\n')
            .replace(/&#13;/g, '')
            .split('\n')
            .map((line: string) => line.replace(this.pathPattern, ''));

        return decode(lines.join('\n').trim());
    }

    private async parseDetails(fault: any): Promise<any[]> {
        return await Promise.all(
            fault.__text
                .split(/\r?\n/)
                .map((line: string) => line.trim())
                .filter((line: string) => this.pathPattern.test(line))
                .map(
                    (detail: string): Promise<Detail> => {
                        const [, file, line] = detail.match(this.pathPattern) as string[];

                        return this.createRange({ file, line: parseInt(line, 10) });
                    }
                )
        );
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

    private async createRange(obj: any): Promise<any | Detail> {
        obj.range = await this.textline.line(obj.file, obj.line - 1);

        return obj;
    }
}
