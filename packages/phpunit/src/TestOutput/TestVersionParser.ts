import type { LineParser } from './LineParser';
import { TeamcityEvent, type TestVersion } from './types';

export class TestVersionParser implements LineParser<TestVersion> {
    private pattern = /^(ParaTest\s(v)?(?<paratest>[\d.]+).+)?PHPUnit\s(?<phpunit>[\d.]+)/i;

    is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    parse(text: string) {
        const matched = text.match(this.pattern)?.groups ?? {};

        return {
            event: TeamcityEvent.testVersion,
            phpunit: matched.phpunit,
            paratest: matched.paratest,
            text,
        };
    }
}
