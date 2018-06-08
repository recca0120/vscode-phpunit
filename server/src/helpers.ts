export function tap<T>(obj: T, callback: Function): T {
    callback(obj);

    return obj;
}
