const PREFIX = '__pest_evaluable_';

function hasPrefix(id?: string) {
    return id?.includes(PREFIX) ?? false;
}

function decodeEvaluable(encoded: string) {
    const idx = encoded.indexOf(PREFIX);
    if (idx === -1) {
        return encoded;
    }

    const before = encoded.slice(0, idx);
    let method = encoded.slice(idx + PREFIX.length);

    // reverse: single _ → space, double __ → literal _
    method = method.replace(/__|_/g, (m) => (m === '__' ? '_' : ' '));

    return before + method;
}

// Pest v4: each describe name is backtick-wrapped and separated by __→__
// The final test name is separated by __→_ (single trailing underscore)
// e.g. `something` → `something else` → it test example
//   → __pest_evaluable__something__→__something_else__→_it_test_example
function decodeDescribePart(inner: string): string {
    // Decode __ → literal _, single _ → segment separator
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

    // FQN heuristic: all parts start with uppercase → namespace separator \
    // otherwise → space (string describe name)
    const isFQN = segments.every((p) => /^[A-Z]/.test(p));
    return `\`${segments.join(isFQN ? '\\' : ' ')}\``;
}

function decodeEvaluableV4(encoded: string): string {
    const prefixIdx = encoded.indexOf(PREFIX);
    if (prefixIdx === -1) {
        return encoded;
    }

    const before = encoded.slice(0, prefixIdx);

    // Separate evaluable method from 'with data set' suffix (not encoded by Pest)
    const methodFull = encoded.slice(prefixIdx + PREFIX.length);
    const datasetIdx = methodFull.search(/\s+with\s+data\s+set\s+/);
    const methodPart = datasetIdx >= 0 ? methodFull.slice(0, datasetIdx) : methodFull;
    const datasetSuffix = datasetIdx >= 0 ? methodFull.slice(datasetIdx) : '';

    // Split by _→_ to separate describe segments from test name
    const segments = methodPart.split('_\u2192_');
    if (segments.length < 2) {
        // No → separator: plain test (no describe), use simple decode
        const decoded = methodPart.replace(/__|_/g, (m) => (m === '__' ? '_' : ' '));
        return before + decoded + datasetSuffix;
    }

    const describeParts = segments.slice(0, -1);
    const testPart = segments[segments.length - 1];

    // Describe parts: strip outer _ (backtick markers), then decode
    const decodedDescribes = describeParts.map((part) => {
        const inner = part.replace(/^_/, '').replace(/_$/, '');
        return decodeDescribePart(inner);
    });

    // Test name: decode _ → space
    const decodedTest = testPart.replace(/__|_/g, (m) => (m === '__' ? '_' : ' '));

    return before + [...decodedDescribes, decodedTest].join(' \u2192 ') + datasetSuffix;
}

export const PestV2Fixer = {
    decodeEvaluableV4,

    fixId(location: string, name: string) {
        if (!hasPrefix(name)) {
            return location;
        }

        const idx = name.indexOf('::');
        const methodPart = idx >= 0 ? name.substring(idx + 2) : name;
        const decoded = decodeEvaluable(methodPart);
        const file = location.split('::')[0];

        return decoded ? `${file}::${decoded}` : file;
    },
};
