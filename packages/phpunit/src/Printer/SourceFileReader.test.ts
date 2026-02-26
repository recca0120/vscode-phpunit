import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import styles from 'ansi-styles';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AnsiStyle, DEFAULT_THEME } from './AnsiStyle';
import { readSourceSnippet } from './SourceFileReader';

describe('readSourceSnippet highlightPhp', () => {
    const style = new AnsiStyle(DEFAULT_THEME);
    const dir = join(tmpdir(), 'source-reader-test');
    const file = join(dir, 'multiply.php');

    beforeAll(() => {
        mkdirSync(dir, { recursive: true });
        writeFileSync(file, ['<?php', '$x = $a', '    * $b;', ''].join('\n'));
    });

    afterAll(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('should not treat multiplication line as doc-comment', () => {
        const lines = readSourceSnippet(file, 3, style);

        expect(lines).toBeDefined();
        // Line 3 is "    * $b;" — the * should NOT be styled as a comment
        const line3 = lines?.find((l) => l.includes('$b'));
        expect(line3).toBeDefined();
        // $b should be styled as a variable (bold)
        expect(line3).toContain(`${styles.bold.open}$b${styles.bold.close}`);
        // The content after delimiter should NOT start with italic (comment style)
        const content = line3?.split('▕')[1] ?? '';
        expect(content).not.toContain(styles.italic.open);
    });
});
