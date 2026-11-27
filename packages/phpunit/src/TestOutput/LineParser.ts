export interface LineParser<T> {
    is: (text: string) => boolean;
    parse: (text: string) => T;
}
