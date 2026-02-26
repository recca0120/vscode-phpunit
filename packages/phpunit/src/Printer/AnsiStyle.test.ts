import styles from 'ansi-styles';
import { describe, expect, it } from 'vitest';
import { AnsiStyle, DEFAULT_THEME } from './AnsiStyle';

describe('AnsiStyle', () => {
    describe('with theme enabled', () => {
        const style = new AnsiStyle(DEFAULT_THEME);

        it('passed applies green', () => {
            expect(style.passed('ok')).toBe(`${styles.green.open}ok${styles.green.close}`);
        });

        it('failed applies red', () => {
            expect(style.failed('err')).toBe(`${styles.red.open}err${styles.red.close}`);
        });

        it('ignored applies yellow', () => {
            expect(style.ignored('skip')).toBe(`${styles.yellow.open}skip${styles.yellow.close}`);
        });

        it('info applies dim', () => {
            expect(style.info('v1')).toBe(`${styles.dim.open}v1${styles.dim.close}`);
        });

        it('bold applies bold', () => {
            expect(style.bold('title')).toBe(`${styles.bold.open}title${styles.bold.close}`);
        });

        it('passedBadge applies bgGreen + bold with padding', () => {
            expect(style.passedBadge('PASS')).toBe(
                `${styles.bold.open}${styles.bgGreen.open} PASS ${styles.bgGreen.close}${styles.bold.close}`,
            );
        });

        it('horizontalRule disables autowrap + red dashes + re-enables', () => {
            const dashes = '─'.repeat(300);
            expect(style.horizontalRule()).toBe(
                `\x1b[?7l${styles.red.open}${dashes}${styles.red.close}\x1b[?7h`,
            );
        });

        it('failedBadge applies bgRed + white + bold with padding', () => {
            expect(style.failedBadge('FAILED')).toBe(
                `${styles.bold.open}${styles.white.open}${styles.bgRed.open} FAILED ${styles.bgRed.close}${styles.white.close}${styles.bold.close}`,
            );
        });

        it('keyword applies magenta + bold', () => {
            expect(style.keyword('function')).toBe(
                `${styles.bold.open}${styles.magenta.open}function${styles.magenta.close}${styles.bold.close}`,
            );
        });

        it('string applies white', () => {
            expect(style.string("'hello'")).toBe(
                `${styles.white.open}'hello'${styles.white.close}`,
            );
        });

        it('comment applies gray + italic', () => {
            expect(style.comment('// note')).toBe(
                `${styles.italic.open}${styles.gray.open}// note${styles.gray.close}${styles.italic.close}`,
            );
        });

        it('lineNumber applies gray', () => {
            expect(style.lineNumber('42')).toBe(`${styles.gray.open}42${styles.gray.close}`);
        });

        it('failedMark applies red + bold', () => {
            expect(style.failedMark('➜ ')).toBe(
                `${styles.bold.open}${styles.red.open}➜ ${styles.red.close}${styles.bold.close}`,
            );
        });

        it('diffExpected applies red', () => {
            expect(style.diffExpected('- foo')).toBe(`${styles.red.open}- foo${styles.red.close}`);
        });

        it('diffActual applies green', () => {
            expect(style.diffActual('+ bar')).toBe(
                `${styles.green.open}+ bar${styles.green.close}`,
            );
        });
    });

    describe('with theme disabled (undefined)', () => {
        const style = new AnsiStyle();

        it('returns plain text', () => {
            expect(style.passed('ok')).toBe('ok');
            expect(style.failed('err')).toBe('err');
            expect(style.ignored('skip')).toBe('skip');
            expect(style.info('v1')).toBe('v1');
            expect(style.keyword('fn')).toBe('fn');
        });

        it('horizontalRule returns fixed-width dashes', () => {
            expect(style.horizontalRule(80)).toBe(`  ${'─'.repeat(76)}`);
        });

        it('failedBadge returns padded plain text', () => {
            expect(style.failedBadge('FAILED')).toBe(' FAILED ');
        });
    });

    describe('with theme disabled (false)', () => {
        const style = new AnsiStyle(false);

        it('returns plain text', () => {
            expect(style.passed('ok')).toBe('ok');
        });
    });

    describe('with custom theme', () => {
        const style = new AnsiStyle({ ...DEFAULT_THEME, passed: 'cyan' });

        it('passed applies custom color', () => {
            expect(style.passed('ok')).toBe(`${styles.cyan.open}ok${styles.cyan.close}`);
        });
    });
});
