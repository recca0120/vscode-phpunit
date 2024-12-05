import { EOL, TestFailed, TestFinished, TestResult, TestResultEvent, TestSuiteFinished } from '../../PHPUnit';
import { Printer } from './Printer';

export class PrettyPrinter extends Printer {
    private decorated = {
        default: '│',
        start: '┐',
        message: '├',
        diff: '┊',
        trace: '╵',
        last: '┴',
    };

    testSuiteFinished(_result: TestSuiteFinished): string | undefined {
        return '';
    }

    testFinished(result: TestFinished | TestFailed) {
        const [icon] = this.messages.get(result.kind)!;
        const name = /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;

        const messages = [`  ${icon} ${name} ${result.duration} ms`];
        if (result.kind === TestResultEvent.testFailed) {
            messages.push(this.formatError(result as TestFailed));
        }

        return messages.join(EOL);
    }

    private formatError(result: TestFailed) {
        return [
            this.formatMessage(this.decorated.start),
            this.formatMessage(this.decorated.message, result.message),
            this.formatDiff(result),

            this.formatMessage(this.decorated.default),
            this.formatDetails(result),
            this.formatMessage(this.decorated.last),
        ].join('');
    }

    private formatDetails(result: TestResult) {
        return result.details.reduce((msg, { file, line }) => {
            return (msg + this.formatMessage(this.decorated.default, `${file}:${line}`));
        }, '');
    }

    private formatDiff(result: TestResult) {
        if (!(result.expected && result.actual)) {
            return;
        }

        return [
            this.formatMessage(this.decorated.diff, `${result.expected}`, '---·Expected '),
            this.formatMessage(this.decorated.diff, `${result.actual}`, '+++·Actual '),
        ].join('');
    }

    private formatMessage(decorated: string, message: string = '', prefix = '') {
        const indent = '     ';

        return message.split(/\r\n|\n/g).reduce((msg, line, index) => {
            return (msg + `${indent}${decorated} ${index === 0 ? prefix : ''}${line}${EOL}`);
        }, '');
    }
}