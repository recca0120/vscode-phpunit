import { ComposerAutoload, PHPUnitXML, type TestGlobPattern } from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import { type GlobPattern, RelativePattern, type WorkspaceFolder, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { Configuration } from '../Configuration';
import { TestCollection } from '../TestCollection';
import { TYPES } from '../types';

export type WorkspaceTestPattern = {
    workspaceFolder: WorkspaceFolder;
    pattern: RelativePattern;
    exclude: RelativePattern;
};

@injectable()
export class TestFileDiscovery {
    private loaded = false;

    constructor(
        @inject(Configuration) private configuration: Configuration,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder,
        @inject(ComposerAutoload)
        private autoload = new ComposerAutoload(() => phpUnitXML.root()),
    ) {}

    async loadWorkspaceConfiguration(): Promise<void> {
        await this.ensureConfigLoaded();
    }

    async getWorkspaceTestPattern(): Promise<WorkspaceTestPattern> {
        await this.ensureConfigLoaded();

        const { includes, excludes } = this.phpUnitXML.getIndexPatterns(
            this.workspaceFolder.uri.fsPath,
        );
        for (const dir of await this.autoload.devDirectories()) {
            includes.push({ tag: 'directory', name: 'autoload-dev', value: dir }, '.php');
        }

        const toRelativePattern = (pattern: TestGlobPattern) => {
            const { uri, pattern: glob } = pattern.toGlobPattern();
            return new RelativePattern(uri, glob);
        };

        return {
            workspaceFolder: this.workspaceFolder,
            pattern: toRelativePattern(includes),
            exclude: toRelativePattern(excludes),
        };
    }

    getConfigFilePattern(): string {
        const configArg = this.configuration
            .getArguments()
            .find((p) => p.startsWith('--configuration='));
        if (configArg) {
            const configFile = configArg.replace('--configuration=', '');
            return `{${configFile},composer.json,composer.lock}`;
        }

        return '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.json,composer.lock}';
    }

    async reloadAll(): Promise<void> {
        this.invalidateCache();
        this.testCollection.reset();
        const { pattern, exclude } = await this.getWorkspaceTestPattern();
        await this.discoverTestFiles(pattern, exclude);
    }

    async discoverTestFiles(pattern: GlobPattern, exclude: GlobPattern): Promise<void> {
        const newFiles = new Set(
            (await workspace.findFiles(pattern, exclude))
                .map((f) => f.toString())
                .filter((uri) => this.isInWorkspaceFolder(uri)),
        );

        for (const file of this.testCollection.gatherFiles()) {
            if (!newFiles.has(file.uri.toString())) {
                this.testCollection.delete(file.uri);
            }
        }

        await Promise.all([...newFiles].map((f) => this.testCollection.add(URI.parse(f))));
    }

    private isInWorkspaceFolder(uri: string): boolean {
        const folderUri = this.workspaceFolder.uri.toString().replace(/\/+$/, '');

        return uri === folderUri || uri.startsWith(`${folderUri}/`);
    }

    private invalidateCache(): void {
        this.loaded = false;
        this.autoload.reset();
    }

    private async ensureConfigLoaded(): Promise<void> {
        if (this.loaded) {
            return;
        }

        const configurationFile = await this.configuration.getConfigurationFile(
            this.workspaceFolder.uri.fsPath,
        );
        if (configurationFile) {
            await this.phpUnitXML.loadFile(configurationFile);
        } else {
            this.phpUnitXML.setRoot(this.workspaceFolder.uri.fsPath);
        }

        this.loaded = true;
    }
}
