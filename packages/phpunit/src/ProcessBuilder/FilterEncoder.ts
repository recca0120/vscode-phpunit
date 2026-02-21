export function base64EncodeFilter(args: string[]) {
    return args.map((input) => {
        const pattern = /^(--filter)=(.*)/;

        return input.replace(pattern, (_m, ...matched) => {
            const value = Buffer.from(matched[1], 'utf-8').toString('base64');

            return `${matched[0]}='${value}'`;
        });
    });
}

export function base64DecodeFilter(args: string[], needsQuote: boolean) {
    return args.map((input) => {
        const pattern = /(--filter)=["'](.+)?["']/;

        return input.replace(pattern, (_m, ...matched) => {
            const value = Buffer.from(matched[1], 'base64').toString('utf-8');
            const quote = value.includes("'") ? '"' : "'";
            const filter = `${matched[0]}=${value}`;

            return needsQuote ? `${quote}${filter}${quote}` : filter;
        });
    });
}
