import { inject, injectable } from 'inversify';
import { window } from 'vscode';
import { Configuration } from '../Configuration';
import type { IConfiguration, TestRunnerObserver } from '../PHPUnit';

@injectable()
export class ErrorDialogObserver implements TestRunnerObserver {
    constructor(@inject(Configuration) private configuration: IConfiguration) {}

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
