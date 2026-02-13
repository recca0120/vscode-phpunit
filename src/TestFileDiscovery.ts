import { GlobPattern, RelativePattern, Uri, workspace, WorkspaceFolder } from 'vscode';
import { Configuration } from './Configuration';
import { Pattern, PHPUnitXML } from './PHPUnit';
import { TestCollection } from './TestCollection';

export type WorkspaceTestPattern = {
    workspaceFolder: WorkspaceFolder;
    pattern: RelativePattern;
    exclude: RelativePattern;
};

export class TestFileDiscovery {
    constructor(
        private configuration: Configuration,
        private phpUnitXML: PHPUnitXML,
        private testCollection: TestCollection,
    ) {}

    async loadInitialConfiguration(): Promise<void> {
        const configurationFile = await this.configuration.getConfigurationFile(
            workspace.workspaceFolders![0].uri.fsPath,
        );
        if (configurationFile) {
            this.testCollection.reset();
            await this.phpUnitXML.loadFile(configurationFile);
        }
    }

    async getWorkspaceTestPatterns(): Promise<WorkspaceTestPattern[]> {
        if (!workspace.workspaceFolders) {
            return [];
        }

        const configuration = new Configuration(workspace.getConfiguration('phpunit'));

        return Promise.all(
            workspace.workspaceFolders.map(async (workspaceFolder: WorkspaceFolder) => {
                const configurationFile = await configuration.getConfigurationFile(
                    workspaceFolder.uri.fsPath,
                );
                configurationFile
                    ? await this.phpUnitXML.loadFile(Uri.file(configurationFile).fsPath)
                    : this.phpUnitXML.setRoot(workspaceFolder.uri.fsPath);
                const { includes, excludes } = this.phpUnitXML.getPatterns(
                    workspaceFolder.uri.fsPath,
                );

                const toRelativePattern = (pattern: Pattern) => {
                    const { uri, pattern: glob } = pattern.toGlobPattern();
                    return new RelativePattern(uri, glob);
                };

                return {
                    workspaceFolder,
                    pattern: toRelativePattern(includes),
                    exclude: toRelativePattern(excludes),
                };
            }),
        );
    }

    async findInitialFiles(pattern: GlobPattern, exclude: GlobPattern): Promise<void> {
        this.testCollection.reset();
        const files = await workspace.findFiles(pattern, exclude);
        await Promise.all(files.map((file) => this.testCollection.add(file)));
    }
}
