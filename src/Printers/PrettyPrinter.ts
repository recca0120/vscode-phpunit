import { EOL, TestExtraResultEvent, TestResult, TestResultEvent, TestResultKind, TestVersion } from '../PHPUnit';
import { Printer } from './Printer';

export class PrettyPrinter implements Printer {
    private icons = new Map<TestResultKind, string>([
        [TestExtraResultEvent.testVersion, '🚀'],
        [TestResultEvent.testFinished, '✅'],
        [TestResultEvent.testFailed, '❌'],
        [TestResultEvent.testIgnored, '➖'],
    ]);
    private decorated = {
        default: '│',
        start: '┐',
        message: '├',
        diff: '┊',
        trace: '╵',
        last: '┴',
    };

    version(result: TestVersion) {
        const icon = this.icons.get(TestExtraResultEvent.testVersion)!;

        return `${icon} ${result.text}`;
    }

    error(text: string) {
        const icon = this.icons.get(TestResultEvent.testFailed)!;

        return `${icon} ${text}`;
    }

    suiteStarted(result: TestResult) {
        return result.id;
    }

    suiteFinished(_result: TestResult) {
        return '';
    }

    testStarted(_result: TestResult) {
        return '';
    }

    testFinished(result: TestResult) {
        const icon = this.icons.get(result.kind)!;
        const name = /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;

        const messages = [`  ${icon} ${name} ${result.duration} ms`];
        if (result.kind === TestResultEvent.testFailed) {
            messages.push(this.formatError(result));
        }

        return messages.join('\n');
    }

    private formatError(result: TestResult) {
        return [
            this.format(this.decorated.start),
            this.format(this.decorated.message, result.message),
            this.formatDiff(result),

            this.format(this.decorated.default),
            result.details.reduce((msg, { file, line }) => {
                return (msg + this.format(this.decorated.default, `${file}:${line}`));
            }, ''),
            this.format(this.decorated.last),
        ].join('') + EOL;
    }

    private formatDiff(result: TestResult) {
        if (!(result.expected && result.actual)) {
            return;
        }

        return [
            this.format(this.decorated.diff, `${result.expected}`, '---·Expected '),
            this.format(this.decorated.diff, `${result.actual}`, '+++·Actual '),
        ].join('');
    }

    private format(decorated: string, message: string = '', prefix = '') {
        const indent = '     ';

        return message.split(/\r\n|\n/g).reduce((msg, line, index) => {
            return (msg + `${indent}${decorated} ${index === 0 ? prefix : ''}${line}${EOL}`);
        }, '');
    }
}