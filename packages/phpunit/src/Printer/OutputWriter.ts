export interface OutputWriter {
    append(text: string): void;
    appendLine(text: string): void;
}
