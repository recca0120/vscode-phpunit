const PREFIX = '__pest_evaluable_';

function hasPrefix(id?: string) {
    return id?.includes(PREFIX) ?? false;
}

function decodeWords(encoded: string): string[] {
    return encoded
        .replace(/__/g, '\0')
        .split('_')
        .map((s) => s.replace(/\0/g, '_'));
}

function decodeDescribePart(inner: string): string {
    const words = decodeWords(inner);
    const isFQN = words.every((p) => /^[A-Z]/.test(p));
    return `\`${words.join(isFQN ? '\\' : ' ')}\``;
}

function decodeEvaluable(encoded: string): string {
    const prefixIdx = encoded.indexOf(PREFIX);
    if (prefixIdx === -1) {
        return encoded;
    }

    const methodFull = encoded.slice(prefixIdx + PREFIX.length);

    const datasetIdx = methodFull.search(/\s+with\s+data\s+set\s+/);
    const [methodPart, datasetSuffix] =
        datasetIdx >= 0
            ? [methodFull.slice(0, datasetIdx), methodFull.slice(datasetIdx)]
            : [methodFull, ''];

    const segments = methodPart.split('_\u2192_');
    const testPart = segments[segments.length - 1];
    const describeParts = segments.slice(0, -1);

    const decoded = [
        ...describeParts.map((part) =>
            decodeDescribePart(part.replace(/^_/, '').replace(/_$/, '')),
        ),
        decodeWords(testPart).join(' '),
    ].join(' \u2192 ');

    return decoded + datasetSuffix;
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
