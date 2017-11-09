import { Validator } from '../src/validator';

describe('Validator Tests', () => {
    it('validate filename', () => {
        const validator = new Validator();

        expect(validator.fileName('test.php')).toBeTruthy();
        expect(validator.fileName('test.inc')).toBeTruthy();
        expect(validator.fileName('test.bat')).toBeFalsy();
        expect(validator.fileName('test.git.php')).toBeFalsy();
        expect(validator.fileName('test.git.inc')).toBeFalsy();
        expect(validator.fileName('test.git.bat')).toBeFalsy();
    });

    it('validate class name', () => {
        const validator = new Validator();

        expect(validator.className('MyTest.php', 'class MyTest extends TestCase')).toBeTruthy();
        expect(validator.className('MyTest.php', 'class MyTest extends PHPUnit\\Framework\\TestCase')).toBeTruthy();
        expect(validator.className('MyTest.php', 'class MyTest extends PHPUnit_Framework_TestCase')).toBeTruthy();
        expect(validator.className('MyTest.php', 'class MyTest')).toBeFalsy();
        expect(validator.className('MyTest.php', 'class MyTest1 extends TestCase')).toBeFalsy();
    });
});
