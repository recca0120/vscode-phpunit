import { CachableFilesystem, FilesystemInterface } from '../filesystem';

import { TextLineFactory } from '../text-line';

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

export const TypeMap = new Map<Type, Type>([
    [Type.PASSED, Type.PASSED],
    [Type.ERROR, Type.ERROR],
    [Type.WARNING, Type.SKIPPED],
    [Type.FAILURE, Type.ERROR],
    [Type.INCOMPLETE, Type.INCOMPLETE],
    [Type.RISKY, Type.RISKY],
    [Type.SKIPPED, Type.SKIPPED],
    [Type.FAILED, Type.ERROR],
]);

export interface Detail {
    file: string;
    line: number;
}

export interface Fault {
    message: string;
    type?: string;
    details?: Detail[];
}

export interface TestCase {
    name: string;
    class: string;
    classname?: string | null;
    file: string;
    line: number;
    time: number;
    type: Type;
    fault?: Fault;
}

export abstract class Parser {
    constructor(
        protected files: FilesystemInterface = new CachableFilesystem(),
        protected textLineFactory: TextLineFactory = new TextLineFactory()
    ) {
        this.textLineFactory.dispose();
    }

    abstract parse(content: string): Promise<TestCase[]>;

    abstract parseString(content: string): Promise<TestCase[]>;

    parseFile(path: string): Promise<TestCase[]> {
        return this.files.getAsync(path).then((content: string) => this.parseString(content));
    }

    protected abstract parseTestCase(data: any): Promise<TestCase>;

    protected currentFile(details: Detail[], testCase: TestCase): Detail {
        return (
            details.find(detail => testCase.file === detail.file && testCase.line !== detail.line) || {
                file: testCase.file,
                line: testCase.line,
            }
        );
    }

    protected filterDetails(details: Detail[], currentFile: Detail): Detail[] {
        return details.filter(detail => detail.file !== currentFile.file && currentFile.line !== detail.line);
    }

    protected parseDetails(content: string): Detail[] {
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => /(.*):(\d+)$/.test(line))
            .map(path => {
                const [, file, line] = path.match(/(.*):(\d+)/) as string[];

                return {
                    file: file.trim(),
                    line: parseInt(line, 10),
                };
            });
    }
}
