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
});