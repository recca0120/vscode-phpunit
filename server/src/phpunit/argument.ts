import { Filesystem, Factory as FilesystemFactory } from '../filesystem';

export class Argument {
    private items: string[] = [];
    private currentDirectory: string = '';
    private root: string = '';

    constructor(private files: Filesystem = new FilesystemFactory().create()) {}

    setRoot(root: string): Argument {
        this.root = root;

        return this;
    }

    setDirectory(directory: string): Argument {
        this.currentDirectory = directory;

        return this;
    }

    set(args: string[]): Argument {
        this.items = args;

        return this;
    }

    get(property: string): any {
        let index: number = this.items.indexOf(property);

        if (index === -1) {
            return false;
        }

        index = index === this.items.length - 1 ? index : index + 1;
        const value: string = this.items[index];

        return value.indexOf('-') === 0 ? true : value;
    }

    exists(property: string): boolean {
        return this.items.some((value: string) => property === value);
    }

    async all(): Promise<string[]> {
        const configuration: string = await this.getConfiguration();

        if (configuration) {
            this.items = this.items.concat(['-c', configuration]);
        }

        const junit = this.getJUnit();
        if (junit) {
            this.items = this.items.concat(['--log-junit', junit]);
        }

        return this.items;
    }

    private async getConfiguration(): Promise<string> {
        if (this.exists('-c') === true || this.exists('--configuration') === true) {
            return '';
        }

        return (
            (await this.files.findUp('phpunit.xml', this.currentDirectory, this.root)) ||
            (await this.files.findUp('phpunit.xml.dist', this.currentDirectory, this.root))
        );
    }

    private getJUnit(): string {
        if (this.exists('--log-junit') === true) {
            return '';
        }

        return this.files.tmpfile('xml', 'phpunit-lsp');
    }
}
