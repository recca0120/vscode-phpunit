export interface FilesystemContract {
    get(path: string): string;
    normalizePath(path: string): string;
    isWindows(): boolean;
}
