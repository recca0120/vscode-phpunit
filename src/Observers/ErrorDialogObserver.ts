import { window } from 'vscode';
import type { IConfiguration, TestRunnerObserver } from '../PHPUnit';

export class ErrorDialogObserver implements TestRunnerObserver {
    constructor(private configuration: IConfiguration) {}

    async error(error: string) {
        if (error.includes('Pest\\Exceptions\\InvalidPestCommand')) {
            const command = 'vendor/bin/pest';
            const message = `Update "phpunit.phpunit" to ${command} ?`;
            const options = { modal: true, detail: error };
            const selection = await window.showWarningMessage(message, options, 'Yes');
            if (selection === 'Yes') {
                await this.configuration.update('phpunit', command);
            }
            return;
        }

        await window.showErrorMessage(error);
    }
}
