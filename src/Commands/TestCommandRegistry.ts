import { inject, injectable } from 'inversify';
import {
    CancellationTokenSource,
    commands,
    type TestItem,
    type TestRunProfile,
    TestRunRequest,
    window,
} from 'vscode';
import { TestCollection } from '../TestCollection';
import { TestFileDiscovery } from '../TestDiscovery';
import { TestRunHandler } from '../TestExecution';

@injectable()
export class TestCommandRegistry {
    private testRunProfile!: TestRunProfile;

    constructor(
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TestRunHandler) private handler: TestRunHandler,
        @inject(TestFileDiscovery) private testFileDiscovery: TestFileDiscovery,
    ) {}

    setTestRunProfile(profile: TestRunProfile) {
        this.testRunProfile = profile;
    }

    reload() {
        return commands.registerCommand('phpunit.reload', async () => {
            await this.testFileDiscovery.reloadAll();
        });
    }

    runAll() {
        return commands.registerCommand('phpunit.run-all', async () => {
            await this.run(undefined);
        });
    }

    runFile() {
        return commands.registerCommand('phpunit.run-file', async () => {
            const uri = window.activeTextEditor?.document.uri;
            if (!uri) {
                return;
            }

            const tests = this.testCollection.findTestsByFile(uri);
            if (tests.length > 0) {
                await this.run(tests);
            }
        });
    }

    runTestAtCursor() {
        return commands.registerCommand('phpunit.run-test-at-cursor', async () => {
            const uri = window.activeTextEditor?.document.uri;
            if (!uri) {
                return;
            }

            const tests = this.testCollection.findTestsByPosition(
                uri,
                window.activeTextEditor?.selection.active!,
            );
            if (tests.length > 0) {
                await this.run(tests);
            }
        });
    }

    runByGroup() {
        return commands.registerCommand('phpunit.run-by-group', async () => {
            let groups = this.testCollection.findGroups();
            if (groups.length === 0) {
                await this.testFileDiscovery.reloadAll();
                groups = this.testCollection.findGroups();
            }
            if (groups.length === 0) {
                window.showInformationMessage(
                    'No PHPUnit groups found. Add @group annotations or #[Group] attributes to your tests.',
                );
                return;
            }

            const selectedGroup = await window.showQuickPick(groups, {
                placeHolder: 'Select a PHPUnit group to run',
                title: 'Run Tests by Group',
            });
            if (!selectedGroup) {
                return;
            }

            const tests = this.testCollection.findTestsByGroup(selectedGroup);
            if (tests.length === 0) {
                window.showInformationMessage(`No tests found for group "${selectedGroup}".`);
                return;
            }

            const cancellation = new CancellationTokenSource().token;
            await this.handler.startGroupTestRun(
                selectedGroup,
                tests,
                cancellation,
                this.testRunProfile,
            );
        });
    }

    rerun() {
        return commands.registerCommand('phpunit.rerun', () => {
            return this.run(
                this.testCollection.findTestsByRequest(this.handler.getPreviousRequest()),
            );
        });
    }

    private async run(include: readonly TestItem[] | undefined) {
        const cancellation = new CancellationTokenSource().token;

        await this.testRunProfile.runHandler(
            new TestRunRequest(include, undefined, this.testRunProfile),
            cancellation,
        );
    }
}
