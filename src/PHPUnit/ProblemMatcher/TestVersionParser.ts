import { TestResultEvent, TestVersion } from './types';
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
        const groups = text.match(this.pattern)!.groups!;

        return {
            event: TestResultEvent.testVersion,
            phpunit: groups.phpunit,
            paratest: groups.paratest,
            text,
        };
    }
}
