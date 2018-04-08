import { tap, value } from '../helpers';
import { decode } from 'he';
import { RangeFinder } from './range-finder';
import { Test, Detail, Type } from './interface';

const parse = require('fast-xml-parser').parse;

export class JUnit {
    constructor(private rangeFinder: RangeFinder = new RangeFinder()) {}

    async parse(code: string): Promise<Test[]> {
        return tap(
            await this.getTests(
                parse(code, {
                    attributeNamePrefix: '_',
                    ignoreAttributes: false,
                    ignoreNameSpace: false,
                    parseNodeValue: true,
                    parseAttributeValue: true,
                    trimValues: true,
                    textNodeName: '__text',
                })
            ),
            () => this.rangeFinder.clear()
        );
    }

    private getSuites(node: any): any[] {
        let testsuite: any = node.testsuites.testsuite;

        while (testsuite.testsuite) {
            testsuite = testsuite.testsuite;
        }

        return testsuite instanceof Array ? [].concat(testsuite) : [testsuite];
    }

    private getTests(node: any): Promise<Test[]> {
        return Promise.all(
            [].concat(
                this.getSuites(node)
                    .reduce((tests: any[], suite: any) => {
                        return tests.concat(suite.testcase);
                    }, [])
                    .map(this.parseTest.bind(this))
            )
        );
    }

    private async parseTest(node: any): Promise<Test> {
        return this.createRange({
            name: node._name || null,
            class: node._class,
            classname: node._classname || null,
            file: node._file,
            line: parseInt(node._line || 1, 10),
            time: parseFloat(node._time || 0),
            type: Type.PASSED,
        }).then((test: Test) => this.parseFault(test, node));
    }

    private async parseFault(test: Test, node: any): Promise<Test> {
        const fault: any = this.getFaultNode(node);

        if (!fault) {
            return test;
        }

        const details: Detail[] = await this.parseDetails(fault);
        const current: Detail = this.current(details, test);
        const message: string = this.parseMessage(fault, details);

        return Object.assign(test, current, {
            type: fault.type,
            fault: {
                type: fault._type || '',
                message: message,
                details: this.filterDetails(details, current),
            },
        });
    }

    private getFaultNode(node: any): any {
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

        return null;
    }

    private parseErrorType(node: any): Type {
        const type = node._type.toLowerCase();

        return (
            [Type.WARNING, Type.FAILURE, Type.INCOMPLETE, Type.RISKY, Type.SKIPPED, Type.FAILED].find(
                errorType => type.indexOf(errorType) !== -1
            ) || Type.ERROR
        );
    }

    private async parseDetails(fault: any): Promise<Detail[]> {
        const pattern: RegExp = /(.*):(\d+)$/;

        return Promise.all(
            [].concat(
                fault.__text
                    .split(/\r?\n/)
                    .map((line: string) => line.trim())
                    .filter((line: string) => pattern.test(line))
                    .map(async (detail: string) => {
                        const [, file, line] = detail.match(pattern) as string[];

                        return await this.createRange({
                            file: file.trim(),
                            line: parseInt(line, 10),
                        });
                    })
            )
        );
    }

    private current(details: Detail[], test: Test): Detail {
        return details.find(detail => test.file === detail.file && test.line !== detail.line) || test;
    }

    private parseMessage(fault: any, details: Detail[]) {
        const messages: string[] = details
            .reduce((message, detail: Detail) => {
                return message.replace(`${detail.file}:${detail.line}`, '').trim();
            }, fault.__text.replace(/\r?\n/g, '\n').replace(/&#13;/g, ''))
            .split(/\n/);

        return value(messages.slice(messages.length === 1 ? 0 : 1).join('\n'), (message: string) => {
            return decode(fault._type ? message.replace(new RegExp(`^${fault._type}:`), '') : message).trim();
        });
    }

    private filterDetails(details: Detail[], current: Detail): Detail[] {
        return details.filter(detail => detail.file !== current.file && detail.line !== current.line);
    }

    private async createRange(item: any): Promise<any> {
        return Object.assign(item, {
            range: await this.rangeFinder.line(item.file, item.line - 1),
        });
    }
}
