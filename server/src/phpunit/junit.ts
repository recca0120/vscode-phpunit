import { tap, value } from '../helpers';
import { decode } from 'he';
import { TextlineRange } from './textline-range';
import { Test, Detail, Type, Node, FaultNode } from './common';
import { FilesystemContract, Filesystem } from '../filesystem';

const parse = require('fast-xml-parser').parse;

export class JUnit {
    private pathPattern: RegExp = /(.*):(\d+)$/;

    constructor(
        private textLineRange: TextlineRange = new TextlineRange(),
        private files: FilesystemContract = new Filesystem()
    ) {}

    async parse(code: string): Promise<Test[]> {
        return tap(
            await this.getTests(
                this.getNodes(
                    parse(code, {
                        attributeNamePrefix: '_',
                        ignoreAttributes: false,
                        ignoreNameSpace: false,
                        parseNodeValue: true,
                        parseAttributeValue: true,
                        trimValues: true,
                        textNodeName: '__text',
                    })
                )
            ),
            () => this.textLineRange.clear()
        );
    }

    private getSuites(node: any): any[] {
        let testsuite: any = node.testsuites.testsuite;

        while (testsuite.testsuite) {
            testsuite = testsuite.testsuite;
        }

        return testsuite instanceof Array ? testsuite : [testsuite];
    }

    private getNodes(node: any): Node[] {
        return this.getSuites(node).reduce((tests: any[], suite: any) => {
            return tests.concat(suite.testcase);
        }, []);
    }

    private getTests(nodes: Node[]): Promise<Test[]> {
        return Promise.all(nodes.map(this.parseTest.bind(this)) as Promise<Test>[]);
    }

    private async parseTest(node: Node): Promise<Test> {
        return this.parseFault(
            Object.assign(await this.createLocation(node._file, parseInt(node._line, 10) || 1), {
                name: node._name || '',
                class: node._class,
                classname: node._classname || '',
                time: parseFloat(node._time) || 0,
                type: Type.PASSED,
            }),
            node
        );
    }

    private async parseFault(test: Test, node: Node): Promise<Test> {
        const fault: any = this.getFaultNode(node);

        if (!fault) {
            return test;
        }

        const details: Detail[] = await this.parseDetails(fault);
        const current: Detail = this.current(details, test);
        const message: string = this.parseMessage(fault);

        return Object.assign(test, current, {
            type: fault.type,
            fault: {
                type: fault._type || '',
                message: message,
                details: this.filterDetails(details, current),
            },
        });
    }

    private getFaultNode(node: Node): FaultNode | undefined {
        const keys: string[] = Object.keys(node);

        if (keys.indexOf('error') !== -1) {
            return tap(node.error, (fault: FaultNode) => (fault.type = this.parseErrorType(fault)));
        }

        if (keys.indexOf('warning') !== -1) {
            return tap(node.warning, (fault: FaultNode) => (fault.type = Type.WARNING));
        }

        if (keys.indexOf('failure') !== -1) {
            return tap(node.failure, (fault: FaultNode) => (fault.type = Type.FAILURE));
        }

        if (keys.indexOf('skipped') !== -1) {
            return {
                type: Type.SKIPPED,
                _type: Type.SKIPPED,
                __text: '',
            };
        }

        if (keys.indexOf('incomplete') !== -1) {
            return {
                type: Type.INCOMPLETE,
                _type: Type.INCOMPLETE,
                __text: '',
            };
        }

        return;
    }

    private parseErrorType(fault: FaultNode): Type {
        const type = fault._type.toLowerCase();

        return (
            [Type.WARNING, Type.FAILURE, Type.INCOMPLETE, Type.RISKY, Type.SKIPPED, Type.FAILED].find(
                errorType => type.indexOf(errorType) !== -1
            ) || Type.ERROR
        );
    }

    private async parseDetails(fault: FaultNode): Promise<Detail[]> {
        return Promise.all(fault.__text
            .split(/\r?\n/)
            .map((line: string) => line.trim())
            .filter((line: string) => this.pathPattern.test(line))
            .map(async (detail: string) => {
                const [, file, line] = detail.match(this.pathPattern) as string[];

                return this.createLocation(file.trim(), parseInt(line, 10));
            }) as Promise<Detail>[]);
    }

    private current(details: Detail[], test: Test): Detail {
        return (
            details.find(detail => test.uri === detail.uri && test.range.start.line !== detail.range.start.line) || test
        );
    }

    private parseMessage(fault: any) {
        const messages: string[] = fault.__text
            .replace(/\r?\n/g, '\n')
            .replace(/&#13;/g, '')
            .split('\n')
            .map((line: string) => line.replace(this.pathPattern, ''));

        return value(messages.slice(messages.length === 1 ? 0 : 1).join('\n'), (message: string) => {
            return decode(fault._type ? message.replace(new RegExp(`^${fault._type}:`), '') : message).trim();
        });
    }

    private filterDetails(details: Detail[], current: Detail): Detail[] {
        return details.filter(
            detail => detail.uri !== current.uri && detail.range.start.line !== current.range.start.line
        );
    }

    private async createLocation(file: string, line: number): Promise<Detail> {
        const uri = this.files.uri(file);

        return {
            uri: uri,
            range: await this.textLineRange.create(uri, line - 1),
        };
    }
}
