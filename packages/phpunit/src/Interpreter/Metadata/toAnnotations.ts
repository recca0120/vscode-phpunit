import { datasetNaming } from '../../Dataset/DatasetNaming';
import type { Annotations } from '../../types';
import type { Metadata } from './Metadata';

export function toAnnotations(metadata: Metadata[]): Annotations {
    const annotations = {} as Annotations;
    const append = (key: string, value: string) => {
        annotations[key] = [...((annotations[key] as string[] | undefined) ?? []), value];
    };
    let testWithIndex = 0;

    for (const item of metadata) {
        if (item.kind === 'group') {
            append('group', item.name);
        } else if (item.kind === 'testDox') {
            append('testdox', item.text);
        } else if (item.kind === 'dataProvider' && !item.className) {
            append('dataProvider', item.methodName);
        } else if (item.kind === 'dependsOnMethod' && !item.className) {
            append('depends', item.methodName);
        } else if (item.kind === 'testWith') {
            append(
                'dataset',
                item.name ? datasetNaming.named(item.name) : datasetNaming.indexed(testWithIndex),
            );
            testWithIndex++;
        }
    }

    return annotations;
}
