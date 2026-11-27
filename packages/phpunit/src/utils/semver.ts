function semverCompare(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

export const semverGte = (a: string, b: string) => semverCompare(a, b) >= 0;
export const semverLt = (a: string, b: string) => semverCompare(a, b) < 0;
