import { Validator } from '../src/validator';

describe('Validator Tests', () => {
    it('validate filename', () => {
        const validator = new Validator();

        expect(validator.validateExtension('test.php')).toBeTruthy();
        expect(validator.validateExtension('test.inc')).toBeTruthy();
        expect(validator.validateExtension('test.bat')).toBeFalsy();
        expect(validator.validateExtension('test.git.php')).toBeFalsy();
        expect(validator.validateExtension('test.git.inc')).toBeFalsy();
        expect(validator.validateExtension('test.git.bat')).toBeFalsy();
    });

    it('validate class name', () => {
        const validator = new Validator();

        expect(validator.vaildateTestCase('MyTest.php', 'class MyTest extends TestCase')).toBeTruthy();
        expect(
            validator.vaildateTestCase('MyTest.php', 'class MyTest extends PHPUnit\\Framework\\TestCase')
        ).toBeTruthy();
        expect(
            validator.vaildateTestCase('MyTest.php', 'class MyTest extends PHPUnit_Framework_TestCase')
        ).toBeTruthy();
        expect(validator.vaildateTestCase('MyTest.php', 'class MyTest')).toBeFalsy();
        expect(validator.vaildateTestCase('MyTest.php', 'class MyTest1 extends TestCase')).toBeTruthy();
        // expect(validator.className('MyTest.php', 'class MyTest')).toBeFalsy();
        // expect(validator.className('MyTest.php', 'class MyTest1 extends TestCase')).toBeFalsy();
    });
});
