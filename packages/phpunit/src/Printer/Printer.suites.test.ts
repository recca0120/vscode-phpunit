import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../test-support/fixtures';
import { EOL } from '../constants';
import { PHPUnitXML } from '../PHPUnitXML/PHPUnitXML';
import { TeamcityEvent, type TestSuiteFinished, type TestSuiteStarted } from '../TestOutput/types';
import { Printer } from './Printer';
import { PRESET_COLLISION } from './PrinterConfig';

describe('Printer suite filtering', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    let printer: Printer;

    beforeEach(() => {
        printer = new Printer(phpUnitXML, { ...PRESET_COLLISION, colors: false });
        printer.start('command');
    });

    afterEach(() => printer.close());

    it('testSuiteStarted returns undefined when id contains ::', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: 'test_passed',
            flowId: 1,
            id: 'App\\Tests\\FooTest::test_passed',
        } as TestSuiteStarted);

        expect(output).toBeUndefined();
    });

    it('testSuiteStarted returns undefined when id is empty', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: '',
            flowId: 1,
            id: '',
        } as TestSuiteStarted);

        expect(output).toBeUndefined();
    });

    it('testSuiteStarted returns value for class-level id', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: 'App\\Tests\\FooTest',
            flowId: 1,
            id: 'App\\Tests\\FooTest',
        } as TestSuiteStarted);

        expect(output).toEqual(` PASS  App\\Tests\\FooTest${EOL}`);
    });

    it('testSuiteFinished returns undefined when id contains ::', () => {
        const output = printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            name: 'test_passed',
            flowId: 1,
            id: 'App\\Tests\\FooTest::test_passed',
        } as TestSuiteFinished);

        expect(output).toBeUndefined();
    });

    it('testSuiteFinished returns undefined when id is empty', () => {
        const output = printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            name: '',
            flowId: 1,
            id: '',
        } as TestSuiteFinished);

        expect(output).toBeUndefined();
    });

    it('testSuiteStarted returns undefined when no file (config path)', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: '/path/to/phpunit.xml',
            flowId: 1,
            id: '/path/to/phpunit.xml',
            file: '',
        } as TestSuiteStarted);

        expect(output).toBeUndefined();
    });

    it('testSuiteStarted returns undefined when no file (testsuite name)', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: 'Unit',
            flowId: 1,
            id: 'Unit',
            file: '',
        } as TestSuiteStarted);

        expect(output).toBeUndefined();
    });

    it('testSuiteFinished returns undefined when no file (testsuite name)', () => {
        const output = printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            name: 'Unit',
            flowId: 1,
            id: 'Unit',
            file: '',
        } as TestSuiteFinished);

        expect(output).toBeUndefined();
    });
});
