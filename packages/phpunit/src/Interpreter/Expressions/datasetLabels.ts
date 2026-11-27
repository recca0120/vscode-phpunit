import { datasetNaming } from '../../Dataset/DatasetNaming';

export function extractLabels(resolved: unknown): string[] | undefined {
    if (!(resolved instanceof Map)) {
        return undefined;
    }
    return toLabels(resolved, { index: 0 });
}

export function toLabels(resolved: Map<string, unknown>, counter: { index: number }): string[] {
    return [...resolved.keys()].map((key: string) =>
        /^\d+$/.test(key) ? datasetNaming.indexed(counter.index++) : datasetNaming.named(key),
    );
}
