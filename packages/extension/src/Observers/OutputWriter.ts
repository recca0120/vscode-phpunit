export interface OutputWriter {
    append(text: string): void;
    clear(): void;
    show(preserveFocus: boolean): void;
}
