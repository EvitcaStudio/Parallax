import { expect, spyOn, test } from 'bun:test';
import { EventEmitter } from '../src/events';

test('listeners are instance-scoped, deduplicated, ordered, and cleaned up', () => {
    const emitter = new EventEmitter(), first = {}, second = {}, received: any[] = [];
    const listener = (event: any) => received.push(event);
    emitter.on(first, 'MoveEvent', listener); emitter.on(first, 'MoveEvent', listener);
    emitter.on(second, 'MoveEvent', listener);
    emitter.emit(first, 'MoveEvent', 42);
    expect(received).toEqual([{ pInstance: first, event: 'MoveEvent', pData: 42 }]);
    emitter.off(first, 'MoveEvent', listener);
    expect(emitter.events.has(first)).toBe(false);
    expect(emitter.events.has(second)).toBe(true);
    emitter.off(first, 'unknown', listener);
    emitter.emit(first, 'MoveEvent');
    expect(received).toHaveLength(1);
});

test('listener mutations during dispatch retain live Set iteration semantics', () => {
    const emitter = new EventEmitter(), owner = {}, calls: string[] = [];
    const skipped = () => calls.push('skipped');
    const added = () => calls.push('added');
    emitter.on(owner, 'move', () => {
        calls.push('first'); emitter.off(owner, 'move', skipped); emitter.on(owner, 'move', added);
    });
    emitter.on(owner, 'move', skipped);
    emitter.emit(owner, 'move');
    expect(calls).toEqual(['first', 'added']);
});

test('a throwing listener does not prevent later listeners running', () => {
    const log = spyOn(console, 'error').mockImplementation(() => {});
    try {
        const emitter = new EventEmitter(), owner = {};
        let calls = 0;
        emitter.on(owner, 'move', () => { throw new Error('listener'); });
        emitter.on(owner, 'move', () => calls++);
        emitter.emit(owner, 'move');
        expect(calls).toBe(1); expect(log).toHaveBeenCalledTimes(1);
    } finally { log.mockRestore(); }
});
