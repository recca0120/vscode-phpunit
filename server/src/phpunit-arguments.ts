import { FilesystemContract } from './filesystem';
import { tap } from './helpers';

export class PhpUnitArguments {
    private arguments: string[];
    private cwd: string;
    private root: string;

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
            this.checkArguments(['-c', '--configuration']) === false &&
            (phpUnitDotXml = await this.getPhpUnitDotXml())
        ) {
            this.arguments.push('-c');
            this.arguments.push(phpUnitDotXml);
        }

        return this.arguments;
    }

    private checkArguments(properties: string[]): boolean {
        return this.arguments.some((arg: string) => properties.indexOf(arg) !== -1);
    }

    private async getPhpUnitDotXml(): Promise<string> {
        return (
            (await this.files.findUp('phpunit.xml', this.cwd, this.root)) ||
            (await this.files.findUp('phpunit.xml.dist', this.cwd, this.root))
        );
    }
}
