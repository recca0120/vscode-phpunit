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
        if (path && this.isGitFile(path) === true) {
            console.warn(path);
            throw State.PHPUNIT_GIT_FILE;
        }

        if (path && this.allowExtension(path) === false) {
            throw State.PHPUNIT_NOT_PHP;
        }

        if (content && this.isTestCase(path, content) === false) {
            throw State.PHPUNIT_NOT_TESTCASE;
        }

        return true;
    }

    isGitFile(fileName: string): boolean {
        return /(\.git\.(php|inc)|\.(php|inc)\.git)$/.test(fileName) === true;
    }

    allowExtension(fileName: string): boolean {
        return /\.(php|inc)$/.test(fileName) === true;
    }

    isTestCase(fileName: string, content?: string) {
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
