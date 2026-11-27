import { describe, expect, it } from 'vitest';
import { splitFQN } from './fqn';

describe('fqn', () => {
    describe('splitFQN', () => {
        it('should split namespace and class', () => {
            expect(splitFQN('App\\Tests\\Unit\\MyTest')).toEqual({
                namespace: 'App\\Tests\\Unit',
                className: 'MyTest',
            });
        });

        it('should handle no namespace', () => {
            expect(splitFQN('MyTest')).toEqual({ namespace: '', className: 'MyTest' });
        });
    });
});
