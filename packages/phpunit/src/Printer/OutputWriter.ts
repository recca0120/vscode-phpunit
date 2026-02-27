export type OutputLocation = { file: string; line: number };

export interface OutputWriter {
    append(text: string, location?: OutputLocation, testId?: string): void;
    appendLine(text: string, location?: OutputLocation, testId?: string): void;
}
