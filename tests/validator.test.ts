import { Filesystem } from 'phpunit-editor-support';
import { Validator } from '../src/validator';

describe('Validator Tests', () => {
    it('allow extension', () => {
        const validator = new Validator();

        expect(validator.allowExtension('test.php')).toBeTruthy();
        expect(validator.allowExtension('test.inc')).toBeTruthy();
        expect(validator.allowExtension('test.bat')).toBeFalsy();
    });

    it('is git file', () => {
        const validator = new Validator();

        expect(validator.isGitFile('test.php')).toBeFalsy();
        expect(validator.isGitFile('test.inc')).toBeFalsy();
        expect(validator.isGitFile('test.git.php')).toBeTruthy();
        expect(validator.isGitFile('test.git.inc')).toBeTruthy();
        expect(validator.isGitFile('test.php.git')).toBeTruthy();
        expect(validator.isGitFile('test.inc.git')).toBeTruthy();
    });

    it('is testcase', () => {
        const files = new Filesystem();
        const validator = new Validator(files);

        spyOn(files, 'get').and.returnValues(
            ...[
                'class MyTest extends TestCase',
                'class MyTest extends PHPUnit\\Framework\\TestCase',
                'class MyTest extends PHPUnit_Framework_TestCase',
                'class MyTest',
                'class MyTest1 extends TestCase',
            ]
        );

        expect(validator.isTestCase('MyTest.php')).toBeTruthy();
        expect(validator.isTestCase('MyTest.php')).toBeTruthy();
        expect(validator.isTestCase('MyTest.php')).toBeTruthy();
        expect(validator.isTestCase('MyTest.php')).toBeFalsy();
        expect(validator.isTestCase('MyTest.php')).toBeTruthy();
    });
});
