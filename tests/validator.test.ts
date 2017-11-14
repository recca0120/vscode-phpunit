import { Validator } from '../src/validator';

describe('Validator Tests', () => {
    const validator = new Validator();

    it('allow extension', () => {
        expect(validator.allowExtension('test.php')).toBeTruthy();
        expect(validator.allowExtension('test.inc')).toBeTruthy();
        expect(validator.allowExtension('test.bat')).toBeFalsy();
    });

    it('is git file', () => {
        expect(validator.isGitFile('test.php')).toBeFalsy();
        expect(validator.isGitFile('test.inc')).toBeFalsy();
        expect(validator.isGitFile('test.git.php')).toBeTruthy();
        expect(validator.isGitFile('test.git.inc')).toBeTruthy();
        expect(validator.isGitFile('test.php.git')).toBeTruthy();
        expect(validator.isGitFile('test.inc.git')).toBeTruthy();
    });

    it('is testcase', () => {
        expect(validator.isTestCase('MyTest.php', 'class MyTest extends TestCase')).toBeTruthy();
        expect(validator.isTestCase('MyTest.php', 'class MyTest extends PHPUnit\\Framework\\TestCase')).toBeTruthy();
        expect(validator.isTestCase('MyTest.php', 'class MyTest extends PHPUnit_Framework_TestCase')).toBeTruthy();
        expect(validator.isTestCase('MyTest.php', 'class MyTest')).toBeFalsy();
        expect(validator.isTestCase('MyTest.php', 'class MyTest1 extends TestCase')).toBeTruthy();
        // expect(validator.isTestCase('MyTest.php', 'class MyTest')).toBeFalsy();
        // expect(validator.isTestCase('MyTest.php', 'class MyTest1 extends TestCase')).toBeFalsy();
    });
});
