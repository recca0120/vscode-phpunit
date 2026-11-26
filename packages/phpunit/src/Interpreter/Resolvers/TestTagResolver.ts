import { datasetExpander } from '../../TestParser/DatasetExpander';
import type { Annotations } from '../../types';
import type { MethodNode } from '../AstParser/AstNode';
import { AnnotationParser } from '../Metadata/AnnotationParser';
import type { Metadata } from '../Metadata/Metadata';
import type { PHP } from '../PHP';
import type { Annotatable, Resolver } from '../types';
import { AttributeVisitor } from '../Visitors/AttributeVisitor';

const tagNames = ['depends', 'dataProvider', 'testdox', 'group'];
const attrLookup = tagNames.map((name) => [name, name.toLowerCase()] as const);

export class TestTagResolver implements Resolver {
    private readonly annotationParser = new AnnotationParser();
    private attribute!: AttributeVisitor;

    resolve(php: PHP): void {
        this.attribute = php.getVisitor(AttributeVisitor);
    }

    parseAnnotations(node: Annotatable): Annotations {
        return {
            ...this.parseTagAnnotations(node),
            ...this.parseAttributeAnnotations(node),
        };
    }

    isTest(method: MethodNode): boolean {
        const visibility = method.visibility ?? '';
        if (visibility !== '' && visibility !== 'public') {
            return false;
        }
        if (method.name.startsWith('test')) {
            return true;
        }
        return this.isAnnotationTagTest(method) || this.isAttributeTest(method);
    }

    private annotationMetadata(node: Annotatable): Metadata[] {
        return node.kind === 'method_declaration'
            ? this.annotationParser.forMethod(node)
            : this.annotationParser.forClass(node);
    }

    private parseTagAnnotations(node: Annotatable): Annotations {
        const annotations = {} as Annotations;
        const append = (key: string, value: string) => {
            annotations[key] = [...((annotations[key] as string[] | undefined) ?? []), value];
        };

        for (const metadata of this.annotationMetadata(node)) {
            if (metadata.kind === 'group') {
                append('group', metadata.name);
            } else if (metadata.kind === 'testDox') {
                append('testdox', metadata.text);
            } else if (metadata.kind === 'dataProvider' && !metadata.className) {
                append('dataProvider', metadata.methodName);
            } else if (metadata.kind === 'dependsOnMethod' && !metadata.className) {
                append('depends', metadata.methodName);
            } else if (metadata.kind === 'testWith') {
                append('dataset', datasetExpander.indexed((annotations.dataset ?? []).length));
            }
        }

        return annotations;
    }

    private parseAttributeAnnotations(node: Annotatable): Annotations {
        const attrs = this.attribute.getAttributes(node);
        if (attrs.length === 0) {
            return {} as Annotations;
        }

        const annotations = {} as Annotations;
        const dataset: string[] = [];
        let datasetIndex = 0;

        for (const attr of attrs) {
            const lowerName = attr.name.toLowerCase();
            for (const [property, target] of attrLookup) {
                if (lowerName.includes(target)) {
                    annotations[property] = [
                        ...((annotations[property] as unknown[] | undefined) ?? []),
                        attr.args[0],
                    ];
                }
            }

            if (attr.name === 'TestWith') {
                const name = attr.args[1];
                dataset.push(
                    typeof name === 'string' && name
                        ? datasetExpander.named(name)
                        : datasetExpander.indexed(datasetIndex),
                );
                datasetIndex++;
            } else if (attr.name === 'TestWithJson') {
                dataset.push(datasetExpander.indexed(datasetIndex));
                datasetIndex++;
            }
        }

        if (dataset.length > 0) {
            annotations.dataset = dataset;
        }

        return annotations;
    }

    private isAnnotationTagTest(method: MethodNode): boolean {
        return this.annotationParser.forMethod(method).some((metadata) => metadata.kind === 'test');
    }

    private isAttributeTest(method: MethodNode): boolean {
        return this.attribute.getAttributes(method).some((attr) => attr.name === 'Test');
    }
}
