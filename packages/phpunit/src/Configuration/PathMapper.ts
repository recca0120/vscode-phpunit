export interface PathMapper {
    toRemote(path: string): string;
    toLocal(path: string): string;
}
