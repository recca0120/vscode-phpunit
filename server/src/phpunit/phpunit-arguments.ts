import { FilesystemContract } from '../filesystem';
import { tap } from '../helpers';

export class PhpUnitArguments {
    private arguments: string[];
    private cwd: string;
    private root: string;
    private jUnitDotXml: string = '';

    constructor(private files: FilesystemContract) {}

    setArguments(args: string[]): PhpUnitArguments {
        return tap(this, (phpUnitArguments: PhpUnitArguments) => {
            phpUnitArguments.arguments = args;
        });
    }

    setCwd(cwd: string): PhpUnitArguments {
        return tap(this, (phpUnitArguments: PhpUnitArguments) => {
            phpUnitArguments.cwd = cwd;
        });
    }

    setRoot(root: string): PhpUnitArguments {
        return tap(this, (phpUnitArguments: PhpUnitArguments) => {
            phpUnitArguments.root = root;
        });
    }

    async getArguments(): Promise<string[]> {
        let phpUnitDotXml: string;

        if (
            this.existsProperty(['-c', '--configuration']) === false &&
            (phpUnitDotXml = await this.getPhpUnitDotXml())
        ) {
            this.arguments = this.arguments.concat(['-c', phpUnitDotXml]);
        }

        if (this.existsProperty(['--log-junit']) === false) {
            this.jUnitDotXml = this.files.tmpfile('xml', 'phpunit-lsp');
            this.arguments = this.arguments.concat(['--log-junit', this.jUnitDotXml]);
        }

        return this.arguments;
    }

    getJUnitDotXml(): string {
        return this.jUnitDotXml;
    }

    private existsProperty(properties: string[]): boolean {
        return this.arguments.some((arg: string) => properties.indexOf(arg) !== -1);
    }

    private async getPhpUnitDotXml(): Promise<string> {
        return (
            (await this.files.findUp('phpunit.xml', this.cwd, this.root)) ||
            (await this.files.findUp('phpunit.xml.dist', this.cwd, this.root))
        );
    }
}
