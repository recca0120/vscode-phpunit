export const cloneInstance = <T extends object>(obj: T): T =>
    Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
