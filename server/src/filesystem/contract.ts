export interface FilesystemContract {
    exists(path: string): boolean;
    get(path: string): string;
    normalizePath(path: string): string;
}
