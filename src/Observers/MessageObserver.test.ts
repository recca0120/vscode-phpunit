import { window } from 'vscode';
import { Configuration, IConfiguration } from '../PHPUnit';
import { MessageObserver } from './MessageObserver';
import Mock = jest.Mock;

describe('MessageObserver', () => {
    let messageObserver: MessageObserver;
    let configuration: IConfiguration;
    beforeEach(() => {
        window.showErrorMessage = jest.fn();
        window.showWarningMessage = jest.fn();
        window.showInformationMessage = jest.fn();
        configuration = new Configuration();
        messageObserver = new MessageObserver(configuration);
    });

    beforeEach(() => {
        (window.showErrorMessage as Mock).mockReset();
        (window.showWarningMessage as Mock).mockReset();
        (window.showInformationMessage as Mock).mockReset();
    });

    afterAll(() => jest.restoreAllMocks());

    it('show error message', async () => {
        const message = 'something went wrong';

        await messageObserver.error(message);

        expect(window.showErrorMessage).toHaveBeenCalledWith(message);
    });

    it('click Yes and set phpunit to vendor/bin/pest', async () => {
        const message = '"\n   Pest\\Exceptions\\InvalidPestCommand \n\n  Please run [./vendor/bin/pest] instead.\n\n"';

        (window.showWarningMessage as Mock).mockReturnValue('Yes');

        await messageObserver.error(message);

        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showWarningMessage).toHaveBeenCalled();
        expect(configuration.get('phpunit')).toEqual('vendor/bin/pest');
    });

    it('click Cancel and do not set phpunit to vendor/bin/pest', async () => {
        const message = '"\n   Pest\\Exceptions\\InvalidPestCommand \n\n  Please run [./vendor/bin/pest] instead.\n\n"';

        (window.showWarningMessage as Mock).mockReturnValue('Cancel');

        await messageObserver.error(message);

        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showWarningMessage).toHaveBeenCalled();
        expect(configuration.get('phpunit')).not.toEqual('vendor/bin/pest');
    });

    it('other pest exception', async () => {
        const message = '"\\n   TypeError \\n\\n  it(): Argument #2 ($closure) must be of type ?Closure, Pest\\\\Expectation given, called in /Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/pest-stub/tests/Unit/ExampleTest.php on line 2\\n\\n  at vendor/pestphp/pest/src/Functions.php:159\\n    155▕      * @param-closure-this TestCase  $closure\\n    156▕      *\\n    157▕      * @return Expectable|TestCall|TestCase|mixed\\n    158▕      */\\n  ➜ 159▕     function it(string $description, ?Closure $closure = null): TestCall\\n    160▕     {\\n    161▕         $description = sprintf(\'it %s\', $description);\\n    162▕ \\n    163▕         /** @var TestCall $test */\\n\\n  1   tests/Unit/ExampleTest.php:2\\n      \u001b[2m+2 vendor frames \u001b[22m\\n  4   tests/Unit/ExampleTest.php:2\\n\\n\\n"';

        await messageObserver.error(message);
    });
});