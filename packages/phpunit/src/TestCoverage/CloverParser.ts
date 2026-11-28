import { XmlElement } from '../Xml/XmlElement';

export interface LineCoverage {
    line: number;
    count: number;
}

export interface MethodCoverage {
    name: string;
    line: number;
    count: number;
}

export interface FileCoverageData {
    filePath: string;
    covered: number;
    total: number;
    lines: LineCoverage[];
    methods?: { covered: number; total: number; declarations: MethodCoverage[] };
}

export class CloverParser {
    async parseFile(file: string): Promise<FileCoverageData[]> {
        try {
            return this.parseElement(await XmlElement.loadFile(file));
        } catch (_ex) {
            return [];
        }
    }

    parseXml(xml: string): FileCoverageData[] {
        return this.parseElement(XmlElement.load(xml));
    }

    private parseElement(element: XmlElement): FileCoverageData[] {
        return [
            ...element.querySelectorAll('coverage project file'),
            ...element.querySelectorAll('coverage project package file'),
        ].map((node) => this.parseFileNode(node));
    }

    private parseFileNode(node: XmlElement): FileCoverageData {
        const metrics = node.querySelector('metrics');

        return {
            filePath: node.getAttribute('name') ?? '',
            covered: parseInt(metrics?.getAttribute('coveredstatements') ?? '0', 10),
            total: parseInt(metrics?.getAttribute('statements') ?? '0', 10),
            lines: node.querySelectorAll('line').map((line) => ({
                line: parseInt(line.getAttribute('num') ?? '1', 10),
                count: parseInt(line.getAttribute('count') ?? '0', 10),
            })),
            methods: {
                covered: parseInt(metrics?.getAttribute('coveredmethods') ?? '0', 10),
                total: parseInt(metrics?.getAttribute('methods') ?? '0', 10),
                declarations: node
                    .querySelectorAll('line')
                    .filter((line) => line.getAttribute('type') === 'method')
                    .map((line) => ({
                        name: line.getAttribute('name') ?? '',
                        line: parseInt(line.getAttribute('num') ?? '1', 10),
                        count: parseInt(line.getAttribute('count') ?? '0', 10),
                    })),
            },
        };
    }
}
