import { TeamcityEvent, TestVersion } from './types';
import { IParser } from './ValueParser';

export class TestVersionParser implements IParser<TestVersion> {
    private pattern = new RegExp(
        '^(ParaTest\\s(v)?(?<paratest>[\\d.]+).+)?PHPUnit\\s(?<phpunit>[\\d.]+)',
        'i',
    );

    is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    parse(text: string) {
        const matched = text.match(this.pattern)!.groups!;

        return {
            event: TeamcityEvent.testVersion,
            phpunit: matched.phpunit,
            paratest: matched.paratest,
            text,
        };
    }
}
