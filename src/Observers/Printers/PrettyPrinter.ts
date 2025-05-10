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

    private formatDetails(result: TestFailed): string {
        const formattedDetails = result.details
            .map(({ file, line }) => Printer.fileFormat(file, line));

        let message = '';
        for (const detail of formattedDetails) {
            message += this.formatMessage(this.decorated.default, detail);
        }
        return message;
    }

    private formatDiff(result: TestFailed): string | undefined {
        if (!(result.expected && result.actual)) {
            return undefined;
        }

        const expected = this.formatMessage(this.decorated.diff, `${result.expected}`, '---·Expected ');
        const actual = this.formatMessage(this.decorated.diff, `${result.actual}`, '+++·Actual ');

        return expected + actual;
    }

    private formatMessage(decorated: string, message: string = '', prefix = ''): string {
        const indent = '     ';
        const lines = message.split(/\r\n|\n/g);
        let formattedMessage = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const currentPrefix = i === 0 ? prefix : '';
            formattedMessage += `${indent}${decorated} ${currentPrefix}${line}${EOL}`;
        }

        return formattedMessage;
    }
}
