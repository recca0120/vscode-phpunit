export interface Filesystem {
    normalizePath(path: string): string;
    setSystemPaths(systemPaths: string): Filesystem;
    where(search: string, currentDirectory?: string): Promise<string>;
    which(search: string, currentDirectory?: string): Promise<string>;
    exists(path: string): Promise<boolean>;
    findUp(search: string, currentDirectory?: string, root?: string): Promise<string>;
    dirname(path: string): string;
    tmpfile(extension?: string, prefix?: string): string;
    get(path: string): Promise<string>;
    unlink(path: string): Promise<boolean>;
}
