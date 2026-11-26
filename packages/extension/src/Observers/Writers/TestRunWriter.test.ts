import { describe, expect, it, type Mock, vi } from 'vitest';
import { type TestItem, TestRunRequest, tests } from 'vscode';
import { TestRunWriter } from './TestRunWriter';

const createTestRun = () =>
    tests.createTestController('phpunit', 'PHPUnit').createTestRun(new TestRunRequest());

describe('TestRunWriter', () => {
    it('append delegates to testRun.appendOutput', () => {
        const testRun = createTestRun();
        const spy: Mock = vi.mocked(testRun.appendOutput);
        const writer = new TestRunWriter(testRun, new Map());

        writer.append('hello');

        expect(spy).toHaveBeenCalledWith('hello', undefined, undefined);
    });

    it('append converts LF to CRLF', () => {
        const testRun = createTestRun();
        const spy: Mock = vi.mocked(testRun.appendOutput);
        const writer = new TestRunWriter(testRun, new Map());

        writer.append('line1\nline2\nline3');

        expect(spy).toHaveBeenCalledWith('line1\r\nline2\r\nline3', undefined, undefined);
    });

    it('append does not double-convert existing CRLF', () => {
        const testRun = createTestRun();
        const spy: Mock = vi.mocked(testRun.appendOutput);
        const writer = new TestRunWriter(testRun, new Map());

        writer.append('line1\r\nline2\nline3');

        expect(spy).toHaveBeenCalledWith('line1\r\nline2\r\nline3', undefined, undefined);
    });

    it('append with location and testId', () => {
        const testRun = createTestRun();
        const spy: Mock = vi.mocked(testRun.appendOutput);
        const testItem = { id: 'MyTest::test_foo' } as TestItem;
        const testItemById = new Map([['MyTest::test_foo', testItem]]);
        const writer = new TestRunWriter(testRun, testItemById);

        writer.append('hello', { file: '/app/tests/MyTest.php', line: 10 }, 'MyTest::test_foo');

        expect(spy).toHaveBeenCalledOnce();
        const [text, location, item] = spy.mock.calls[0];
        expect(text).toBe('hello');
        expect(location.uri.path).toBe('/app/tests/MyTest.php');
        expect(location.range.line).toBe(9);
        expect(item).toBe(testItem);
    });

    it('appendLine converts LF to CRLF', () => {
        const testRun = createTestRun();
        const spy: Mock = vi.mocked(testRun.appendOutput);
        const writer = new TestRunWriter(testRun, new Map());

        writer.appendLine('hello');

        expect(spy).toHaveBeenCalledWith('hello\r\n', undefined, undefined);
    });

    it('appendLine with location and testId', () => {
        const testRun = createTestRun();
        const spy: Mock = vi.mocked(testRun.appendOutput);
        const testItem = { id: 'MyTest::test_bar' } as TestItem;
        const testItemById = new Map([['MyTest::test_bar', testItem]]);
        const writer = new TestRunWriter(testRun, testItemById);

        writer.appendLine('hello', { file: '/app/tests/MyTest.php', line: 5 }, 'MyTest::test_bar');

        expect(spy).toHaveBeenCalledOnce();
        const [text, location, item] = spy.mock.calls[0];
        expect(text).toBe('hello\r\n');
        expect(location.uri.path).toBe('/app/tests/MyTest.php');
        expect(location.range.line).toBe(4);
        expect(item).toBe(testItem);
    });
});
