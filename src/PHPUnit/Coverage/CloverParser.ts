import type { PathReplacer } from '../ProcessBuilder/PathReplacer';
import { XmlElement } from '../XmlElement';

export interface LineCoverage {
    line: number;
    count: number;
}

export interface FileCoverageData {
    filePath: string;
    covered: number;
    total: number;
    lines: LineCoverage[];
}

export class CloverParser {
    constructor(private pathReplacer?: PathReplacer) {}

    async parseClover(file: string): Promise<FileCoverageData[]> {
        try {
            return this.parseElement(await XmlElement.loadFile(file));
        } catch (_ex) {
            return [];
        }
    }

    parseCloverXml(xml: string): FileCoverageData[] {
        return this.parseElement(XmlElement.load(xml));
    }

    private parseElement(element: XmlElement): FileCoverageData[] {
        const replacer = this.pathReplacer;
        const toLocal = replacer ? (p: string) => replacer.toLocal(p) : undefined;

        return [
            ...element.querySelectorAll('coverage project file'),
            ...element.querySelectorAll('coverage project package file'),
        ].map((node) => this.parseFileNode(node, toLocal));
    }

    private parseFileNode(node: XmlElement, toLocal?: (p: string) => string): FileCoverageData {
        const name = node.getAttribute('name') ?? '';
        const metrics = node.querySelector('metrics');

        return {
            filePath: toLocal ? toLocal(name) : name,
            covered: parseInt(metrics?.getAttribute('coveredstatements') ?? '0', 10),
            total: parseInt(metrics?.getAttribute('statements') ?? '0', 10),
            lines: node.querySelectorAll('line').map((line) => ({
                line: parseInt(line.getAttribute('num') ?? '1', 10),
                count: parseInt(line.getAttribute('count') ?? '0', 10),
            })),
        };
    }
}
