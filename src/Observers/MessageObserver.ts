import { window } from 'vscode';

import { IConfiguration, TestRunnerObserver } from '../PHPUnit';

export class MessageObserver implements TestRunnerObserver {
    constructor(private configuration: IConfiguration) {}

    async error(error: string) {
        if (error.indexOf('Pest\\Exceptions\\InvalidPestCommand') === -1) {
            await window.showErrorMessage(error);
            return;
        }

        const command = 'vendor/bin/pest';
        const message = `Update "phpunit.phpunit" to ${command} ?`;
        const options = { modal: true, detail: error };
        const selection = await window.showWarningMessage(message, options, 'Yes');
        if (selection === 'Yes') {
            await this.configuration.update('phpunit', command);
        }
    }
}