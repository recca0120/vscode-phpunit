export function when<T>(value: T, success: Function, fail?: Function): any {
    if (value) {
        return success(value);
    } else if (fail) {
        return fail(value);
    }

    return '';
}
