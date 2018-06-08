export interface Filesystem {
    normalizePath(path: string): string;
    setSystemPaths(systemPaths: string): Filesystem;
    where(search: string, cwd: string): Promise<string>;
    which(search: string, cwd?: string): Promise<string>;
    exists(path: string): Promise<boolean>;
}
