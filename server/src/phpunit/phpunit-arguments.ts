import { FilesystemContract } from '../filesystem';
import { tap } from '../helpers';

export class PhpUnitArguments {
    private arguments: string[];
    private cwd: string;
    private root: string;
    private jUnitDotXml: string = '';

    constructor(private files: FilesystemContract) {}

    set(args: string[] | string): PhpUnitArguments {
        return tap(this, (phpUnitArguments: PhpUnitArguments) => {
            phpUnitArguments.arguments = args instanceof Array ? args : [args];
        });
    }

    get(property: string): string {
        let index: number;
        if ((index = this.arguments.indexOf(property)) !== -1) {
            return this.arguments[index + 1];
        }

        return '';
    }

    exists(property: string): boolean {
        return this.arguments.some((arg: string) => property === arg);
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

    async all(): Promise<string[]> {
        let phpUnitDotXml: string;

        if (
            this.exists('-c') === false &&
            this.exists('--configuration') === false &&
            (phpUnitDotXml = await this.findPhpUnitDotXml())
        ) {
            this.arguments = this.arguments.concat(['-c', phpUnitDotXml]);
        }

        if (this.exists('--log-junit') === false) {
            this.jUnitDotXml = this.files.tmpfile('xml', 'phpunit-lsp');
            this.arguments = this.arguments.concat(['--log-junit', this.jUnitDotXml]);
        }

        return this.arguments;
    }

    private async findPhpUnitDotXml(): Promise<string> {
        return (
            (await this.files.findUp('phpunit.xml', this.cwd, this.root)) ||
            (await this.files.findUp('phpunit.xml.dist', this.cwd, this.root))
        );
    }
}
