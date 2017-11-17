import { Store } from '../src/store';
import { Type } from '../src/parsers/parser';
import { generateRandomTestCase } from './helpers';
import { normalizePath } from '../src/helpers';

describe('Store Test', () => {
    it('get details', () => {
        const passed = generateRandomTestCase(10, {
            type: Type.PASSED,
        });

        const error = generateRandomTestCase(10, {
            type: Type.ERROR,
        });

        const skipped = generateRandomTestCase(10, {
            type: Type.SKIPPED,
        });

        const incomplete = generateRandomTestCase(10, {
            type: Type.INCOMPLETE,
        });

        const risky = generateRandomTestCase(10, {
            type: Type.RISKY,
        });

        const items = passed
            .concat(error)
            .concat(skipped)
            .concat(incomplete)
            .concat(risky);

        const store = new Store(items);

        expect(store.getDetails().values()).toEqual(
            items
                .reduce((results, item) => {
                    if (results.some(result => result.file === item.file)) {
                        return results;
                    }

                    return results.concat([item]);
                }, [])
                .reduce((results, item) => {
                    results.push({
                        key: normalizePath(item.file),
                        type: item.type,
                        file: item.file,
                        line: item.line,
                        fault: {
                            message: item.fault ? item.fault.message : null,
                        },
                    });

                    return !item.fault
                        ? results
                        : results.concat(
                              item.fault.details.map(detail => {
                                  return {
                                      key: normalizePath(detail.file),
                                      type: item.type,
                                      file: detail.file,
                                      line: detail.line,
                                      fault: {
                                          message: item.fault.message,
                                      },
                                  };
                              })
                          );
                }, [])
        );
    });
});
