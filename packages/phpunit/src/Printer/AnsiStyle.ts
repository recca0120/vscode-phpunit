import styles from 'ansi-styles';

export interface ColorTheme {
    passed: string;
    failed: string;
    ignored: string;
    info: string;
    diffExpected: string;
    diffActual: string;
    failedDot: string;
    errorDot: string;
    skippedDot: string;
}

export const DEFAULT_THEME: ColorTheme = {
    passed: 'green',
    failed: 'red',
    ignored: 'yellow',
    info: 'dim',
    diffExpected: 'red',
    diffActual: 'green',
    failedDot: 'bgRed.white',
    errorDot: 'red.bold',
    skippedDot: 'cyan.bold',
};

type StyleEntry = { open: string; close: string };

function getStyle(name: string): StyleEntry | undefined {
    return (styles as unknown as Record<string, StyleEntry>)[name];
}

function applyStyles(names: string, text: string): string {
    let result = text;
    for (const name of names.split('.')) {
        const style = getStyle(name);
        if (style) {
            result = style.open + result + style.close;
        }
    }

    return result;
}

export class AnsiStyle {
    private enabled: boolean;
    private theme: ColorTheme;

    constructor(theme?: ColorTheme | false) {
        this.enabled = theme !== undefined && theme !== false;
        this.theme = this.enabled ? (theme as ColorTheme) : DEFAULT_THEME;
    }

    get isEnabled(): boolean {
        return this.enabled;
    }

    passed(text: string): string {
        return this.apply(this.theme.passed, text);
    }

    failed(text: string): string {
        return this.apply(this.theme.failed, text);
    }

    ignored(text: string): string {
        return this.apply(this.theme.ignored, text);
    }

    info(text: string): string {
        return this.apply(this.theme.info, text);
    }

    bold(text: string): string {
        return this.apply('bold', text);
    }

    /** Horizontal rule: disable autowrap + red dashes (overflow truncated), or fixed-width */
    horizontalRule(columns = 80): string {
        if (this.enabled) {
            const dashes = '─'.repeat(300);

            // CSI?7l = disable DECAWM (no wrap), CSI?7h = re-enable
            return `\x1b[?7l${this.apply('red', dashes)}\x1b[?7h`;
        }

        return `  ${'─'.repeat(Math.max(1, columns - 4))}`;
    }

    /** Badge: green bg + bold for PASS */
    passedBadge(text: string): string {
        return this.apply('bgGreen.bold', ` ${text} `);
    }

    /** Badge: red bg + white + bold for FAIL */
    failedBadge(text: string): string {
        return this.apply('bgRed.white.bold', ` ${text} `);
    }

    /** Badge: yellow bg + bold for WARN */
    warnBadge(text: string): string {
        return this.apply('bgYellow.bold', ` ${text} `);
    }

    /** PHP syntax: keyword = magenta + bold */
    keyword(text: string): string {
        return this.apply('magenta.bold', text);
    }

    /** PHP syntax: string = light_gray (white) */
    string(text: string): string {
        return this.apply('white', text);
    }

    /** PHP syntax: comment = gray + italic */
    comment(text: string): string {
        return this.apply('gray.italic', text);
    }

    /** PHP syntax: variable/number = default + bold */
    variable(text: string): string {
        return this.apply('bold', text);
    }

    /** Snippet: arrow mark = red + bold */
    failedMark(text: string): string {
        return this.apply('red.bold', text);
    }

    /** Snippet: line number = gray */
    lineNumber(text: string): string {
        return this.apply('gray', text);
    }

    failedDot(text: string): string {
        return this.apply(this.theme.failedDot, text);
    }

    errorDot(text: string): string {
        return this.apply(this.theme.errorDot, text);
    }

    skippedDot(text: string): string {
        return this.apply(this.theme.skippedDot, text);
    }

    diffExpected(text: string): string {
        return this.apply(this.theme.diffExpected, text);
    }

    diffActual(text: string): string {
        return this.apply(this.theme.diffActual, text);
    }

    private apply(styleName: string, text: string): string {
        if (!this.enabled) {
            return text;
        }

        return applyStyles(styleName, text);
    }
}
