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

export const PestV2Fixer = {
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
