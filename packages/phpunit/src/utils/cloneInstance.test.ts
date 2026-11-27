import { describe, expect, it } from 'vitest';
import { cloneInstance } from './cloneInstance';

describe('cloneInstance', () => {
    describe('cloneInstance', () => {
        it('should create a copy with same prototype', () => {
            class Foo {
                constructor(public value: number) {}
                double() {
                    return this.value * 2;
                }
            }
            const original = new Foo(5);
            const clone = cloneInstance(original);

            expect(clone).not.toBe(original);
            expect(clone.value).toBe(5);
            expect(clone.double()).toBe(10);
            expect(clone).toBeInstanceOf(Foo);
        });

        it('should create a shallow copy', () => {
            class Bar {
                constructor(public data: { x: number }) {}
            }
            const original = new Bar({ x: 1 });
            const clone = cloneInstance(original);

            clone.data.x = 99;
            expect(original.data.x).toBe(99);
        });
    });
});
