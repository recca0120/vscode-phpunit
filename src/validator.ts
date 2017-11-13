import { Filesystem } from './filesystem';

export class Validator {
    testCaseClass: string[] = [
        'PHPUnit\\\\Framework\\\\TestCase',
        'PHPUnit\\Framework\\TestCase',
        'PHPUnit_Framework_TestCase',
        'TestCase',
    ];

    constructor(private files: Filesystem = new Filesystem()) {}

    fileName(fileName: string): boolean {
        return /\.git\.(php|inc)/.test(fileName) === false && /\.(php|inc)$/.test(fileName) === true;
    }

    className(fileName: string, content?: string) {
        content = content || this.files.get(fileName);

        if (new RegExp(`(abstract\\s+class|trait|interface)\\s+`, 'i').test(content)) {
            return false;
        }

        return new RegExp(`class\\s+.+\\s+extends\\s+(${this.testCaseClass.join('|')})`, 'i').test(content);

        // const className = fileName
        //     .substr(fileName.replace(/\\/g, '/').lastIndexOf('/') + 1)
        //     .replace(/\.(php|inc)$/i, '')
        //     .trim();

        // if (new RegExp(`(abstract\\s+class|trait|interface)\\s+${className}`, 'i').test(content)) {
        //     return false;
        // }

        // return new RegExp(`class\\s+${className}\\s+extends\\s+(${this.testCaseClass.join('|')})`, 'i').test(content);
    }
}
