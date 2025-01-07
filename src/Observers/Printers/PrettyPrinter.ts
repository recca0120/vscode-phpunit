import { EOL, TeamcityEvent, TestFailed, TestFinished, TestSuiteFinished } from '../../PHPUnit';
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

    testFinished(result: TestFinished | TestFailed) {
        const [icon] = this.messages.get(result.event)!;
        const name = /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;

        const messages = [`  ${icon} ${name} ${result.duration} ms`];
        if (result.event === TeamcityEvent.testFailed) {
            messages.push(this.formatError(result as TestFailed));
        }

        return messages.join(EOL);
    }

    testSuiteFinished(_result: TestSuiteFinished): string | undefined {
        return '';
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

    private formatDetails(result: TestFailed) {
        return result.details
            .map(({ file, line }) => Printer.fileFormat(file, line))
            .reduce((msg, file) => (msg + this.formatMessage(this.decorated.default, file)), '');
    }

    private formatDiff(result: TestFailed) {
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