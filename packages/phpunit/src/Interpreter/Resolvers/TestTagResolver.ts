import { datasetExpander } from '../../TestParser/DatasetExpander';
import type { Annotations } from '../../types';
import type { AstNode, MethodNode } from '../AstParser/AstNode';
import type { PHP } from '../PHP';
import type { Annotatable, Resolver } from '../types';
import { AttributeVisitor } from '../Visitors/AttributeVisitor';
import { PhpDocVisitor } from '../Visitors/PhpDocVisitor';

interface AnnotationTag {
    name: string;
    value: string;
}

const tagPattern = /@(\w+)(?:\s+([^\n]+))?/g;
const tagNames = ['depends', 'dataProvider', 'testdox', 'group'];
const tagLookup = new Map(tagNames.map((name) => [name.toLowerCase(), name]));
const attrLookup = tagNames.map((name) => [name, name.toLowerCase()] as const);

export class TestTagResolver implements Resolver {
    private phpDoc!: PhpDocVisitor;
    private attribute!: AttributeVisitor;

    resolve(php: PHP): void {
        this.phpDoc = php.getVisitor(PhpDocVisitor);
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

    private getTags(node: AstNode): AnnotationTag[] {
        const tags: AnnotationTag[] = [];
        for (const comment of this.phpDoc.getComments(node)) {
            for (const match of comment.matchAll(tagPattern)) {
                tags.push({
                    name: match[1],
                    value: (match[2] ?? '').replace(/\s*\*\/\s*$/, '').trim(),
                });
            }
        }
        return tags;
    }

    private parseTagAnnotations(node: Annotatable): Annotations {
        const annotations = {} as Annotations;
        for (const tag of this.getTags(node)) {
            const matched = tagLookup.get(tag.name.toLowerCase());
            if (!matched) {
                continue;
            }
            if (tag.value) {
                annotations[matched] = [
                    ...((annotations[matched] as unknown[] | undefined) ?? []),
                    tag.value,
                ];
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
        return this.getTags(method).some((tag) => tag.name === 'test');
    }

    private isAttributeTest(method: MethodNode): boolean {
        return this.attribute.getAttributes(method).some((attr) => attr.name === 'Test');
    }
}
