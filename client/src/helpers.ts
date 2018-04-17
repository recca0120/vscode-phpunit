export function tap<T>(value: T, callback: Function): T {
    callback(value);

    return value;
}

export function when<T>(value: T, success: any, fail?: any): any {
    if (value) {
        return success instanceof Function ? success(value) : success;
    } else if (fail) {
        return fail instanceof Function ? fail(value) : fail;
    }

    return '';
}
