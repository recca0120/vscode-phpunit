import { Parser } from './parser';

const parser = new Parser();
export const parse = (buffer: Buffer | string, file: string) => parser.parse(buffer, file);
