export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
export const uncapitalize = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);
export const snakeCase = (str: string) =>
    str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
export const camelCase = (str: string) =>
    str
        .toLowerCase()
        .replace(/([-_ \s]+[a-z])/g, (group) => group.toUpperCase().replace(/[-_ \s]/g, ''));
export const titleCase = (str: string) =>
    capitalize(
        str
            .replace(/([A-Z]+|[_\-\s]+([A-Z]+|[a-z]))/g, (_: string, matched: string) => {
                return ` ${matched.trim().replace(/[_-]/, '').toUpperCase()}`;
            })
            .trim(),
    );
