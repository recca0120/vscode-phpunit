import {
    Configuration,
    type OutputWriter,
    type Path,
    PathReplacer,
    PHPUnitXML,
    PRESET_PROGRESS,
    Printer,
    ProcessBuilder,
    semverLt,
    TeamcityEvent,
    TestRunner,
} from '@vscode-phpunit/phpunit';
import { detectPhpUnitStubs, phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestRun } from 'vscode';
import { PrinterObserver } from './PrinterObserver';
import { OutputChannelWriter, TestRunWriter } from './Writers';

const writers = [
    {
        writerName: 'OutputChannelWriter',
        createWriter: () => {
            const spy = vi.fn();
            const outputChannel = { append: spy, appendLine: vi.fn() };
            return { writer: new OutputChannelWriter(outputChannel), spy };
        },
    },
    {
        writerName: 'TestRunWriter',
        createWriter: () => {
            const testRun = { appendOutput: vi.fn() } as unknown as TestRun;
            const writer = new TestRunWriter(testRun, new Map());
            const spy = vi.fn();
            const originalAppend = writer.append.bind(writer);
            writer.append = (text: string, ...args: unknown[]) => {
                spy(text);
                originalAppend(text, ...(args as []));
            };
            return { writer, spy };
        },
    },
];

describe.each(writers)('PrinterObserver with $writerName', ({ createWriter }) => {
    describe.each(detectPhpUnitStubs())('on $name (PHPUnit $phpUnitVersion)', ({
        root,
        phpUnitVersion,
        binary,
        args: stubArgs,
    }) => {
        let testRunner: TestRunner;
        let spy: ReturnType<typeof vi.fn>;
        let configuration: Configuration;

        beforeEach(() => {
            configuration = new Configuration({
                php: 'php',
                phpunit: binary,
                args: ['-c', 'phpunit.xml', ...stubArgs],
            });
            testRunner = new TestRunner();
            const { writer, spy: s } = createWriter();
            spy = s;
            const observer = new PrinterObserver(
                writer,
                new Printer(new PHPUnitXML(), PRESET_PROGRESS),
            );
            testRunner.observe(observer);
        });

        async function run(file?: string, filter?: string) {
            if (filter) {
                filter = `--filter='^.*::(${filter})( with data set .*)?$'`;
            }

            const cwd = root;
            const options = { cwd };
            const builder = new ProcessBuilder(
                configuration,
                options,
                new PathReplacer(options, configuration.get('paths') as Path),
            );
            builder.setArguments([file, filter].join(' '));

            await testRunner.run(builder).run();
        }

        it('should trigger testVersion', async () => {
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            await run(testFile);

            expect(spy).toHaveBeenCalledWith(expect.stringMatching(/PHPUnit\s[\d.]+/));
        });

        it('should trigger testRuntime', async () => {
            if (semverLt(phpUnitVersion, '10.0.0')) {
                return;
            }

            const testFile = phpUnitProject('tests/AssertionsTest.php');
            await run(testFile);

            expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Runtime:\s+PHP\s[\d.]+/));
        });

        it('should trigger testConfiguration', async () => {
            if (semverLt(phpUnitVersion, '10.0.0')) {
                return;
            }

            const testFile = phpUnitProject('tests/AssertionsTest.php');
            await run(testFile);

            expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Configuration:.+/));
        });

        it('should trigger testFinished', async () => {
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            const filter = 'test_passed';
            await run(testFile, filter);

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('.'));
        });

        it('should trigger testFailed', async () => {
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            const filter = 'test_failed|test_passed';
            await run(testFile, filter);

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('F'));
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining('Failed asserting that false is true.'),
            );
        });

        it('should trigger testFailed with actual and expect', async () => {
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            const filter = 'test_is_not_same';
            await run(testFile, filter);

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('F'));
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining('Failed asserting that two arrays are identical.'),
            );
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('--- Expected'));
        });

        it('should trigger testIgnored', async () => {
            const testFile = phpUnitProject('tests/AssertionsTest.php');
            const filter = 'test_skipped';
            await run(testFile, filter);

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('S'));
        });

        it('should trigger testResultSummary', async () => {
            if (semverLt(phpUnitVersion, '10.0.0')) {
                return;
            }

            const testFile = phpUnitProject('tests/AssertionsTest.php');
            await run(testFile);

            expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Tests: \d+, Assertions: \d+/));
        });

        it('should trigger testDuration', async () => {
            if (semverLt(phpUnitVersion, '10.0.0')) {
                return;
            }

            const testFile = phpUnitProject('tests/AssertionsTest.php');
            await run(testFile);

            expect(spy).toHaveBeenCalledWith(
                expect.stringMatching(/Time: [\d:.]+(\s\w+)?, Memory: [\d.]+\s\w+/),
            );
        });

        it('should trigger error', async () => {
            const testFile = phpUnitProject('tests/NotFound.php');
            await run(testFile);

            expect(spy).toHaveBeenCalledWith(expect.stringMatching('❌'));
            expect(spy).toHaveBeenCalledWith(expect.stringMatching(/NotFound\.php/));
        });

        it('should print printed output', async () => {
            const testFile = phpUnitProject('tests/Output/OutputTest.php');
            const filter = 'test_echo';
            await run(testFile, filter);

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('printed output'));
        });
    });
});

describe('PrinterObserver passes testId to writer', () => {
    it('testFinished passes testId to writer.append', () => {
        const appendSpy = vi.fn();
        const writer: OutputWriter = { append: appendSpy, appendLine: vi.fn() };
        const printer = new Printer(new PHPUnitXML(), PRESET_PROGRESS);
        const observer = new PrinterObserver(writer, printer);

        observer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_passed',
            locationHint: '',
            flowId: 1,
            id: 'App\\Tests\\MyTest::test_passed',
            file: '/app/tests/MyTest.php',
        });

        observer.testFinished({
            event: TeamcityEvent.testFinished,
            name: 'test_passed',
            locationHint: '',
            flowId: 1,
            id: 'App\\Tests\\MyTest::test_passed',
            file: '/app/tests/MyTest.php',
            duration: 5,
        });

        expect(appendSpy).toHaveBeenCalledWith(
            expect.any(String),
            undefined,
            'App\\Tests\\MyTest::test_passed',
        );
    });

    it('testFailed passes testId to writer.append', () => {
        const appendSpy = vi.fn();
        const writer: OutputWriter = { append: appendSpy, appendLine: vi.fn() };
        const printer = new Printer(new PHPUnitXML(), PRESET_PROGRESS);
        const observer = new PrinterObserver(writer, printer);

        observer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_fail',
            locationHint: '',
            flowId: 1,
            id: 'App\\Tests\\MyTest::test_fail',
            file: '/app/tests/MyTest.php',
        });

        observer.testFailed({
            event: TeamcityEvent.testFailed,
            name: 'test_fail',
            locationHint: '',
            flowId: 1,
            id: 'App\\Tests\\MyTest::test_fail',
            file: '/app/tests/MyTest.php',
            message: 'Failed',
            details: [],
            duration: 0,
        });

        expect(appendSpy).toHaveBeenCalledWith(
            expect.any(String),
            undefined,
            'App\\Tests\\MyTest::test_fail',
        );
    });
});
