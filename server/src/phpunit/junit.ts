import { tap } from '../helpers';
import { decode } from 'he';
const fastXmlParser = require('fast-xml-parser');

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

export interface Detail {
    file: string;
    line: number;
}

export interface Fault {
    message: string;
    type?: string;
    details?: Detail[];
}

export interface Test {
    name: string;
    class: string;
    classname: string;
    file: string;
    line: number;
    time: number;
    type: Type;
    fault?: Fault;
}

export class JUnit {
    parse(code: string): Test[] {
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

        return testsuites.testsuite instanceof Array ? [].concat(testsuites.testsuite) : [testsuites.testsuite];
    }

    private getTests(node: any): Test[] {
        return this.getSuites(node)
            .reduce((tests: any[], suite: any) => {
                return tests.concat(suite.testcase);
            }, [])
            .map(this.parseTest.bind(this));
    }

    private parseTest(node: any): Test {
        return this.parseFault(
            {
                name: node._name || null,
                class: node._class,
                classname: node._classname || null,
                file: node._file,
                line: parseInt(node._line || 1, 10),
                time: parseFloat(node._time || 0),
                type: Type.PASSED,
            },
            node
        );
    }

    private parseFault(test: Test, node: any) {
        const fault: any = this.getFaultNode(node);

        if (!fault) {
            return test;
        }

        const details: Detail[] = this.parseDetails(fault);
        const currentDetail: Detail = this.currentDetail(details, test);
        const message: string = this.parseMessage(fault, details);

        return Object.assign(test, currentDetail, {
            type: fault.type,
            fault: {
                type: fault._type || '',
                message: message,
                details: this.filterDetails(details, currentDetail),
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

    private parseDetails(fault: any): Detail[] {
        const pattern: RegExp = /(.*):(\d+)$/;

        return fault.__text
            .split(/\r?\n/)
            .map((line: string) => line.trim())
            .filter((line: string) => pattern.test(line))
            .map((detail: string) => {
                const [, file, line] = detail.match(pattern) as string[];

                return {
                    file: file.trim(),
                    line: parseInt(line, 10),
                };
            });
    }

    private currentDetail(details: Detail[], node: any): Detail {
        return (
            details.find(detail => node.file === detail.file && node.line !== detail.line) || {
                file: node.file,
                line: node.line,
            }
        );
    }

    private parseMessage(fault: any, details: Detail[]) {
        const messages: string[] = details
            .reduce((message, detail: Detail) => {
                return message.replace(`${detail.file}:${detail.line}`, '').trim();
            }, fault.__text.replace(/\r?\n/g, '\n').replace(/&#13;/g, ''))
            .split(/\n/);

        const message: string = messages.length === 1 ? messages[0] : messages.slice(1).join('\n');

        return decode(fault._type ? message.replace(new RegExp(`^${fault._type}:`, 'g'), '').trim() : message.trim());
    }

    private filterDetails(details: Detail[], current: Detail): Detail[] {
        return details.filter(detail => detail.file !== current.file && detail.line !== current.line);
    }
}
