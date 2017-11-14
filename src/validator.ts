import { Filesystem } from './filesystem';
import { State } from './command/phpunit';

export class Validator {
    testCaseClass: string[] = [
        'PHPUnit\\\\Framework\\\\TestCase',
        'PHPUnit\\Framework\\TestCase',
        'PHPUnit_Framework_TestCase',
        'TestCase',
    ];

    constructor(private files: Filesystem = new Filesystem()) {}

    validate(path: string, content?: string) {
        if (path && this.validateExtension(path) === false) {
            throw State.PHPUNIT_NOT_PHP;
        }

        if (content && this.vaildateTestCase(path, content) === false) {
            throw State.PHPUNIT_NOT_TESTCASE;
        }

        return true;
    }

    validateExtension(fileName: string): boolean {
        return /\.git\.(php|inc)/.test(fileName) === false && /\.(php|inc)$/.test(fileName) === true;
    }

    vaildateTestCase(fileName: string, content?: string) {
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
