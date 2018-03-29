export interface FilesystemContract {
    exists(path: string): boolean;
    get(path: string): string;
    normalizePath(path: string): string;
    setSystemPaths(systemPaths: string): FilesystemContract;
    getSystemPaths(): string[];
    where(search: string, cwd?: string): string;
    which(search: string, cwd?: string): string;
    findUp(search: string, cwd?: string, root?: string): string;
}
