import { type TestDefinition, TestType } from '../types';

const DATASET_PATTERN =
    /^(?<base>.*?)(?<dataset>\swith\s(?<label>data\sset\s[#"(].+|dataset\s".+|\(.+))$/;

class DatasetExpander {
    named(key: string): string {
        return `data set "${key}"`;
    }

    indexed(index: number | string): string {
        return `data set #${index}`;
    }

    fromAnnotations(parent: TestDefinition, labels: string[]): TestDefinition[] {
        return labels.map((label) => this.create(parent, label));
    }

    fromTestOutput(parent: TestDefinition, name: string): TestDefinition | undefined {
        const { dataset, label } = this.parse(name);
        if (!label) {
            return undefined;
        }

        return this.create(parent, label, dataset);
    }

    parse(id: string): { parentId: string; dataset: string; label: string } {
        const match = id.match(DATASET_PATTERN);
        if (!match?.groups) {
            return { parentId: id, dataset: '', label: '' };
        }
        const label = this.normalizeLabel(match.groups.label);
        return {
            parentId: match.groups.base,
            dataset: match.groups.dataset,
            label,
        };
    }

    private normalizeLabel(label: string): string {
        const match = label.match(/^data set "(.+)"$/);
        if (!match) {
            return label;
        }
        const inner = match[1];
        if (inner.startsWith('dataset ') || inner.startsWith('(')) {
            return inner;
        }
        return label;
    }

    private create(parent: TestDefinition, label: string, dataset?: string): TestDefinition {
        return {
            type: TestType.dataset,
            id: `${parent.id}${dataset ?? ` with ${label}`}`,
            label: `with ${this.normalizeLabel(label)}`,
            classFQN: parent.classFQN,
            namespace: parent.namespace,
            className: parent.className,
            methodName: parent.methodName,
            file: parent.file,
            start: parent.start,
            end: parent.end,
        };
    }
}

export const datasetExpander = new DatasetExpander();
