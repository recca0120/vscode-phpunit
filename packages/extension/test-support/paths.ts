import { expect } from 'vitest';

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const samePath = (path: string) =>
    expect.stringMatching(new RegExp(`^${escapeRegExp(path)}$`, 'i'));
