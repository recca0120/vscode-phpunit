const PREFIX = '__pest_evaluable_';

function hasPrefix(id?: string) {
    return id?.includes(PREFIX) ?? false;
}

function decodeDescribePart(inner: string): string {
    const segments: string[] = [];
    let current = '';
    let i = 0;
    while (i < inner.length) {
        if (inner[i] === '_' && inner[i + 1] === '_') {
            current += '_';
            i += 2;
        } else if (inner[i] === '_') {
            segments.push(current);
            current = '';
            i++;
        } else {
            current += inner[i];
            i++;
        }
    }
    segments.push(current);
    const isFQN = segments.every((p) => /^[A-Z]/.test(p));
    return `\`${segments.join(isFQN ? '\\' : ' ')}\``;
}

function decodeEvaluable(encoded: string): string {
    const prefixIdx = encoded.indexOf(PREFIX);
    if (prefixIdx === -1) {
        return encoded;
    }

    const before = encoded.slice(0, prefixIdx);
    const methodFull = encoded.slice(prefixIdx + PREFIX.length);

    const datasetIdx = methodFull.search(/\s+with\s+data\s+set\s+/);
    const methodPart = datasetIdx >= 0 ? methodFull.slice(0, datasetIdx) : methodFull;
    const datasetSuffix = datasetIdx >= 0 ? methodFull.slice(datasetIdx) : '';

    const segments = methodPart.split('_\u2192_');
    if (segments.length < 2) {
        const decoded = methodPart.replace(/__|_/g, (m) => (m === '__' ? '_' : ' '));
        return before + decoded + datasetSuffix;
    }

    const describeParts = segments.slice(0, -1);
    const testPart = segments[segments.length - 1];

    const decodedDescribes = describeParts.map((part) => {
        const inner = part.replace(/^_/, '').replace(/_$/, '');
        return decodeDescribePart(inner);
    });

    const decodedTest = testPart.replace(/__|_/g, (m) => (m === '__' ? '_' : ' '));

    return before + [...decodedDescribes, decodedTest].join(' \u2192 ') + datasetSuffix;
}

export const PestV2Fixer = {
    fixId(location: string, name: string) {
        if (!hasPrefix(name)) {
            return location;
        }

        const idx = name.indexOf('::');
        const methodPart = idx >= 0 ? name.substring(idx + 2) : name;
        const decoded = decodeEvaluable(methodPart);
        const file = location.split('::')[0];

        return `${file}::${decoded}`;
    },
};
