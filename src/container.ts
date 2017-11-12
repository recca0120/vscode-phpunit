import { Filesystem } from './filesystem';
import { ProcessFactory } from './process';
import { Store } from './store';
import { TextLineFactory } from './text-line';
import { Validator } from './validator';

const files = new Filesystem();
const processFactory = new ProcessFactory();
const store = new Store();
const textLineFactory = new TextLineFactory(files);
const validator = new Validator(files);

export class Container {
    protected singleton = {
        files,
        processFactory,
        store,
        textLineFactory,
        validator,
    };

    get(key) {
        return this.getSingleton(key);
    }

    set(key, object) {
        return this.setSingleton(key, object);
    }

    protected getSingleton(key) {
        return this.singleton[key];
    }

    protected setSingleton(key, object) {
        this.singleton[key] = object;

        return this;
    }

    get files() {
        return this.getSingleton('files');
    }
    
    get processFactory() {
        return this.getSingleton('processFactory');
    }
    
    get store() {
        return this.getSingleton('store');
    }

    get textLineFactory() {
        return this.getSingleton('textLineFactory');
    }

    get validator() {
        return this.getSingleton('validator');
    }
}

export const container: Container = new Container();
