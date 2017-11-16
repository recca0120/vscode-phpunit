import { Filesystem } from './filesystem';

export class Validator {
    testCaseClass: string[] = [
        'PHPUnit\\\\Framework\\\\TestCase',
        'PHPUnit\\Framework\\TestCase',
        'PHPUnit_Framework_TestCase',
        'TestCase',
    ];

    constructor(private files: Filesystem = new Filesystem()) {}

    isGitFile(path: string): boolean {
        return /(\.git\.(php|inc)|\.(php|inc)\.git)$/.test(path) === true;
    }

    allowExtension(path: string): boolean {
        return /\.(php|inc)$/.test(path) === true;
    }

    isTestCase(path: string) {
        const content = this.files.get(path);

        if (new RegExp(`(abstract\\s+class|trait|interface)\\s+`, 'i').test(content)) {
            return false;
        }

        return new RegExp(`class\\s+.+\\s+extends\\s+(${this.testCaseClass.join('|')})`, 'i').test(content);

        // const className = path
        //     .substr(path.replace(/\\/g, '/').lastIndexOf('/') + 1)
        //     .replace(/\.(php|inc)$/i, '')
        //     .trim();

        // if (new RegExp(`(abstract\\s+class|trait|interface)\\s+${className}`, 'i').test(content)) {
        //     return false;
        // }

        // return new RegExp(`class\\s+${className}\\s+extends\\s+(${this.testCaseClass.join('|')})`, 'i').test(content);
    }
}
