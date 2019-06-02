import { Connection } from 'vscode-languageserver';

export interface IConfiguration {
    maxNumberOfProblems: number;
    files: string;
    php?: string;
    phpunit?: string;
    args?: string[];
}

export class Configuration implements IConfiguration {
    defaults: IConfiguration = {
        maxNumberOfProblems: 10000,
        files: '**/*.php',
    };

    configurationCapability = true;

    constructor(private connection: Connection) {}

    get maxNumberOfProblems(): number {
        return this.defaults.maxNumberOfProblems;
    }

    get files(): string {
        return this.defaults.files;
    }

    get php(): string | undefined {
        return this.defaults.php;
    }

    get phpunit(): string | undefined {
        return this.defaults.phpunit;
    }

    get args(): string[] | undefined {
        return this.defaults.args;
    }

    async update() {
        if (this.configurationCapability) {
            this.defaults = await this.connection.workspace.getConfiguration(
                'phpunit'
            );
        }

        return this;
    }

    setConfigurationCapability(configurationCapability: boolean) {
        this.configurationCapability = configurationCapability;

        return this;
    }
}
