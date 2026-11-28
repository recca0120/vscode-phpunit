import { dirname, isAbsolute, join, relative } from 'node:path';
import {
    ComposerAutoload,
    PHPUnitXML,
    type TestGlobPattern,
    VAR_WORKSPACE_FOLDER,
    XmlParseError,
} from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import { type GlobPattern, RelativePattern, type WorkspaceFolder, window, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { Configuration } from '../Configuration';
import { TestTree } from '../TestTree';
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
        @inject(TestTree) private testTree: TestTree,
        @inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder,
        @inject(ComposerAutoload)
        private autoload = new ComposerAutoload(() => phpUnitXML.root()),
    ) {}

    async loadWorkspaceConfiguration(): Promise<void> {
        await this.ensureConfigLoaded();
    }

    async getWorkspaceTestPattern(): Promise<WorkspaceTestPattern> {
        await this.ensureConfigLoaded();

        const { includes, excludes } = this.phpUnitXML.testFilePatterns(
            this.workspaceFolder.uri.fsPath,
        );
        for (const dir of await this.autoload.devDirectories()) {
            includes.add({ tag: 'directory', name: 'autoload-dev', value: dir }, '.php');
        }

        const toRelativePattern = (pattern: TestGlobPattern) => {
            const { uri, pattern: glob } = pattern.toRelativePattern();
            return new RelativePattern(uri, glob);
        };

        return {
            workspaceFolder: this.workspaceFolder,
            pattern: toRelativePattern(includes),
            exclude: toRelativePattern(excludes),
        };
    }

    getConfigFilePattern(): RelativePattern {
        const configurationFile = this.configurationFileArgument();
        if (!configurationFile) {
            return new RelativePattern(
                this.workspaceFolder,
                '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.json,composer.lock}',
            );
        }

        const root = this.workspaceFolder.uri.fsPath;
        const base = this.commonAncestor(root, dirname(configurationFile));
        const files = [
            configurationFile,
            join(root, 'composer.json'),
            join(root, 'composer.lock'),
        ].map((file) => relative(base, file).replace(/\\/g, '/'));

        return new RelativePattern(URI.file(base), `{${files.join(',')}}`);
    }

    async reloadAll(): Promise<void> {
        this.testTree.markBusy(true);
        try {
            this.invalidateCache();
            this.testTree.clear();
            const { pattern, exclude } = await this.getWorkspaceTestPattern();
            await this.discoverTestFiles(pattern, exclude);
        } finally {
            this.testTree.markBusy(false);
        }
    }

    async discoverTestFiles(pattern: GlobPattern, exclude: GlobPattern): Promise<void> {
        const newFiles = new Set(
            (await workspace.findFiles(pattern, exclude))
                .map((f) => f.toString())
                .filter((uri) => this.isInWorkspaceFolder(uri)),
        );

        for (const file of this.testTree.files()) {
            if (!newFiles.has(file.uri.toString())) {
                this.testTree.remove(file.uri);
            }
        }

        await Promise.all([...newFiles].map((f) => this.testTree.add(URI.parse(f))));
    }

    private configurationFileArgument(): string | undefined {
        const configArg = this.configuration
            .arguments()
            .find((p) => p.startsWith('--configuration='));
        if (!configArg) {
            return undefined;
        }

        const root = this.workspaceFolder.uri.fsPath;
        const configurationFile = configArg
            .replace('--configuration=', '')
            .replace(VAR_WORKSPACE_FOLDER, root);

        return isAbsolute(configurationFile) ? configurationFile : join(root, configurationFile);
    }

    private commonAncestor(root: string, directory: string): string {
        let base = root;
        while (relative(base, directory).startsWith('..') && dirname(base) !== base) {
            base = dirname(base);
        }

        return base;
    }

    private isInWorkspaceFolder(uri: string): boolean {
        const folderUri = this.workspaceFolder.uri.toString().replace(/\/+$/, '');

        return uri === folderUri || uri.startsWith(`${folderUri}/`);
    }

    private invalidateCache(): void {
        this.loaded = false;
        this.autoload.clear();
    }

    private async ensureConfigLoaded(): Promise<void> {
        if (this.loaded) {
            return;
        }

        const configurationFile = await this.configuration.findConfigurationFile(
            this.workspaceFolder.uri.fsPath,
        );
        this.reportConfigurationError(await this.loadConfiguration(configurationFile));

        this.loaded = true;
    }

    private async loadConfiguration(configurationFile: string | undefined) {
        if (!configurationFile) {
            this.phpUnitXML.unload().setRoot(this.workspaceFolder.uri.fsPath);
            return undefined;
        }

        try {
            await this.phpUnitXML.loadFile(configurationFile);
            return undefined;
        } catch (error) {
            if (!(error instanceof XmlParseError)) {
                throw error;
            }
            return `${configurationFile}:${error.line} ${error.message}`;
        }
    }

    private reportConfigurationError(message: string | undefined): void {
        if (!this.testTree.markError(message) && message) {
            window.showErrorMessage(`PHPUnit: ${message}`);
        }
    }
}
