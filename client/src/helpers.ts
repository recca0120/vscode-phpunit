export function when<T>(value: T, success: any, fail?: any): any {
    if (value) {
        return success instanceof Function ? success(value) : success;
    } else if (fail) {
        return fail instanceof Function ? fail(value) : fail;
    }

    return '';
}
