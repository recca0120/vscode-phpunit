import { readFileSync } from 'node:fs'; // Keep for now, will remove after async conversion
import { readFile } from 'node:fs/promises'; // Import async readFile
import { EOL, TeamcityEvent, TestFailed, TestFinished, TestIgnored, TestSuiteFinished } from '../../PHPUnit';
import { Printer } from './Printer';

export class CollisionPrinter extends Printer {
    private errors: TestFailed[] = [];


    start() {
        super.start();
        this.errors = [];
    }

    testFinished(result: TestFinished | TestFailed | TestIgnored) {
        const [icon] = this.messages.get(result.event)!;
        const name = /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;

        if (result.event === TeamcityEvent.testFailed) {
            this.errors.push(result as TestFailed);
        }

        if (result.event === TeamcityEvent.testIgnored) {
            return `${icon} ${name} ➜ ${(result as TestIgnored).message} ${result.duration} ms`;
        }

        return `${icon} ${name} ${result.duration} ms`;
    }

    testSuiteFinished(_result: TestSuiteFinished): string | undefined {
        return '';
    }

    async end(): Promise<string> { // Make end() async
        const formattedErrors = await Promise.all(this.errors.map((result) => this.formatError(result)));
        return formattedErrors.join(EOL);
    }

    private async formatError(result: TestFailed): Promise<string> { // Make formatError() async
        const fileContent = await this.getFileContent(result); // Await async getFileContent
        return [
            '',
            this.formatErrorTitle(result),
            this.formatMessage(result),
            this.formatDiff(result),
            fileContent, // Use awaited content
            this.formatDetails(result),
            '',
        ].filter((content) => content !== undefined).join(EOL);
    }

    private formatErrorTitle(result: TestFailed) {
        let [className, method] = result.id.split('::');
        method = method.replace(/^test_/, '');
        const [icon, message] = this.messages.get(result.event)!;

        return `${icon} ${message}  ${className} > ${method}`;
    }

    private formatMessage(result: TestFailed) {
        return result.message;
    }

    private formatDiff(result: TestFailed) {
        if (!result.expected || !result.actual) {
            return undefined;
        }

        return [
            ' Array &0 [',
            this.formatExpected(result.expected!, '-'),
            this.formatExpected(result.actual!, '+'),
            ' ]',
            '',
        ].join(EOL);
    }

    private async getFileContent(result: TestFailed): Promise<string | undefined> { // Make getFileContent() async
        // Prioritize the first detail entry if available, otherwise use the file from the result
        const detail = result.details.length > 0 ? result.details[0] : (result.file ? { file: result.file, line: 0 } : undefined);

        if (!detail || !detail.file) {
            return undefined;
        }

        try {
            const filePath = this.phpUnitXML.path(detail.file);
            const data = await readFile(filePath, 'utf8'); // Use async readFile
            const lines = data.split(/\r\n|\n/);
            const startLine = Math.max(0, detail.line - 1 - 4); // 5 lines before
            const endLine = Math.min(lines.length, detail.line - 1 + 5); // 5 lines after

            const formattedLines = lines.slice(startLine, endLine).map((line, index) => {
                const currentPosition = startLine + index + 1;
                const prefix = detail.line === currentPosition ? '➜ ' : '  ';

                return `${prefix}${String(currentPosition).padStart(2, ' ')} ▕ ${line}`;
            });

            return [
                '',
                `at ${Printer.fileFormat(detail.file, detail.line)}`,
                ...formattedLines,
            ].join(EOL);
        } catch (e) {
            console.error(`Error reading file ${detail.file}:`, e); // Log error
            return undefined;
        }
    }

    private formatDetails(result: TestFailed) {
        return EOL + result.details
            .map(({ file, line }) => Printer.fileFormat(file, line))
            .map((file, index) => `${index + 1}. ${file}`).join(EOL);
    }

    private formatExpected(expected: string, prefix: string) {
        return expected
            .replace(/^Array\s+&0\s+[(\[]/, '')
            .replace(/[)\]]$/, '')
            .trim()
            .split(/\r\n|\n/)
            .map((text) => `${prefix}    ${text.trim()}`)
            .join(EOL);
    }
}
