import * as faker from 'faker';

import { TestCase, Type } from 'phpunit-editor-support';

import { resolve as pathResolve } from 'path';

export function generateRandomTestCase(num?: number, options: any = {}): TestCase[] {
    num = num || Math.floor(Math.random() * 50) + 1;

    const items: TestCase[] = [];

    for (let i = 0; i < num; i++) {
        const type = faker.random.arrayElement([Type.PASSED, Type.ERROR, Type.SKIPPED, Type.INCOMPLETE, Type.RISKY]);

        const fault =
            type === Type.PASSED
                ? {}
                : {
                      fault: {
                          type: faker.random.word(),
                          message: faker.lorem.text(),
                          details: [
                              {
                                  file: pathResolve(__dirname, faker.system.commonFileName('php', 'text')),
                                  line: faker.random.number(),
                              },
                          ],
                      },
                  };

        items.push(
            Object.assign(
                {
                    name: faker.random.word(),
                    class: faker.random.word(),
                    classname: faker.random.word(),
                    file: pathResolve(__dirname, faker.system.commonFileName('php', 'text')),
                    line: faker.random.number(),
                    time: faker.random.number(),
                    type: type,
                },
                fault,
                options
            )
        );
    }

    return items;
}
