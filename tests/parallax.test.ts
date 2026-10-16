import { beforeEach, expect, test } from 'bun:test';
import { Parallax, ParallaxSingleton } from '../src/parallax';
import { Layer } from '../src/layer';
import { Instance, environment } from './support';

beforeEach(() => {
    environment();
    Parallax.instances.clear();
    Parallax.instanceWeakMap = new WeakMap();
    Parallax.lastCamPos = { x: null, y: null };
    Parallax.resetAnchor();
});

test('camera motion preserves depth factors, negative scales, and zero-speed centering', () => {
    const manager = new ParallaxSingleton();
    const object = new Instance(); object.setPos(20, 30, 'test-map');
    manager.add(object, { horizontalSpeed: .5, verticalSpeed: -.25 });
    manager.update(100, 80);
    expect([object.x, object.y]).toEqual([70, 10]);
    const background = new Instance(); background.scale = { x: -2, y: -3 };
    manager.add(background, { horizontalSpeed: 0, verticalSpeed: 0 });
    manager.update(200, 120);
    expect([background.x, background.y]).toEqual([100, 0]);
});

test('stationary updates avoid coordinate setters without suppressing initial MoveEvent', () => {
    const manager = new ParallaxSingleton(), object = new Instance();
    let events = 0;
    manager.events.on(object, 'MoveEvent', () => events++);
    manager.add(object, { horizontalSpeed: 1, verticalSpeed: 1 });
    expect(events).toBe(1);
    object.writes = { x: 0, y: 0 };
    for (let i = 0; i < 100; i++) manager.update(0, 0);
    expect(object.writes).toEqual({ x: 0, y: 0 });
    expect(events).toBe(1);
    object.x = 40; manager.update(0, 0);
    expect(events).toBe(2);
});

test('horizontal movement never rewrites stationary parent/child Y coordinates', () => {
    const manager = new ParallaxSingleton(), object = new Instance();
    manager.add(object, { horizontalSpeed: .5, verticalSpeed: .5, infiniteHorizontal: true });
    const children = manager.instanceWeakMap.get(object)!.horizontalChildren as Instance[];
    for (const entry of [object, ...children]) entry.writes = { x: 0, y: 0 };
    manager.update(10, 0);
    expect(object.writes).toEqual({ x: 1, y: 0 });
    for (const child of children) {
        expect(child.writes).toEqual({ x: 1, y: 0 });
        expect([child.x, child.y]).toEqual([object.x + child.relativeX, object.y + child.relativeY]);
    }
});

test('loop children on both axes follow before the movement event fires', () => {
    const manager = new ParallaxSingleton(), object = new Instance();
    manager.add(object, { horizontalSpeed: .5, verticalSpeed: .5, infiniteHorizontal: true, infiniteVertical: true });
    const info = manager.instanceWeakMap.get(object)!;
    const children = [...info.horizontalChildren!, ...info.verticalChildren!] as Instance[];
    let events = 0;
    manager.events.on(object, 'MoveEvent', () => {
        events++;
        for (const child of children) {
            expect([child.x, child.y]).toEqual([object.x + child.relativeX, object.y + child.relativeY]);
        }
    });
    manager.update(2200, -1700);
    expect(events).toBe(1);
    manager.update(2200, -1700);
    expect(events).toBe(1);
});

test('wrap thresholds remain exact and large teleports wrap multiple tiles', () => {
    environment(false);
    for (const [cameraX, cameraY, expectedX, expectedY] of [
        [200, 160, 100, 80],
        [202, 162, 201, 161],
        [-34, -28, -17, -14],
        [-36, -30, -118, -95],
    ]) {
        const manager = new ParallaxSingleton(), object = new Instance();
        manager.add(object, { horizontalSpeed: .5, verticalSpeed: .5, infiniteHorizontal: true, infiniteVertical: true });
        manager.update(cameraX, cameraY);
        expect([object.x, object.y]).toEqual([expectedX, expectedY]);
    }
    const manager = new ParallaxSingleton(), object = new Instance();
    manager.add(object, { horizontalSpeed: .5, verticalSpeed: .5, infiniteHorizontal: true, infiniteVertical: true });
    manager.update(10000, -10000);
    const before = [object.x, object.y];
    expect(Math.abs(object.x - 10000)).toBeLessThanOrEqual(117);
    expect(Math.abs(object.y + 10000)).toBeLessThanOrEqual(94);
    manager.update(10000, -10000);
    expect([object.x, object.y]).toEqual(before);
});

test('ground covers a wide viewport in either direction with dynamically edited clone offsets', () => {
    const { eye, screen } = environment(); screen.width = 1900;
    const manager = new ParallaxSingleton(), ground = new Instance();
    manager.add(ground, { horizontalSpeed: .5, verticalSpeed: .5, ground: true,
        groundY: 300, groundMapname: 'sea', infiniteHorizontal: true });
    const children = manager.instanceWeakMap.get(ground)!.horizontalChildren!;
    for (const x of [5000, -5000, 12000, -12000]) {
        eye.x = x; manager.update(x, 100);
        const positions = [ground.x, ...children.map(child => child.x)];
        expect(Math.min(...positions)).toBeLessThanOrEqual(x - screen.width / 2);
        expect(Math.max(...positions) + 100).toBeGreaterThanOrEqual(x + screen.width / 2);
        expect(ground.y).toBe(300);
        expect(ground.mapName).toBe('sea');
    }
    children[0].relativeX -= 100;
    eye.x -= 5000; manager.update(eye.x, 100);
    expect(children[0].x).toBe(ground.x + children[0].relativeX);
});

test('anchors retain existing precedence, including the zero-anchor fallback', () => {
    const manager = new ParallaxSingleton(), object = new Instance();
    manager.setCameraAnchor({ x: 0, y: 40 });
    manager.add(object, { horizontalSpeed: .5, verticalSpeed: .5, cameraAnchorX: 20, cameraAnchorY: 80 });
    expect([object.x, object.y]).toEqual([-10, -20]);
    expect(manager.getCameraAnchor()).toEqual({ x: 0, y: 40 });
    manager.resetAnchor();
    expect(manager.isAnchorXSet()).toBe(false);
    expect(manager.isAnchorYSet()).toBe(false);
});

test('duplicate add, removal, and clone snapshot semantics remain intact', () => {
    const manager = new ParallaxSingleton(), object = new Instance();
    const config = { horizontalSpeed: .5, verticalSpeed: .5, infiniteHorizontal: true };
    manager.add(object, config);
    const count = manager.instances.size;
    manager.add(object, config);
    expect(manager.instances.size).toBe(count);
    const snapshot = object.getParallaxChildren!(); snapshot.length = 0;
    expect(object.getParallaxChildren!().length).toBeGreaterThan(0);
    config.horizontalSpeed = 9;
    expect(manager.instanceWeakMap.get(object)!.horizontalSpeed).toBe(.5);
    manager.remove(object); manager.update(100, 100);
    expect(manager.instanceWeakMap.has(object)).toBe(false);
});

test('layer speed changes propagate to existing instances and future additions', () => {
    const first = new Instance(), second = new Instance();
    const layer = new Layer({ plane: 5, horizontalSpeed: .2, verticalSpeed: .3, instances: [first] });
    layer.updateHorizontalSpeed(.7, false);
    layer.updateVerticalSpeed(-.4, false);
    layer.add(second);
    for (const entry of [first, second]) {
        expect(entry.plane).toBe(5);
        expect(Parallax.instanceWeakMap.get(entry)).toMatchObject({ horizontalSpeed: .7, verticalSpeed: -.4 });
    }
    layer.remove(first);
    expect(layer.getInstances()).toEqual([second]);
    expect(Parallax.instances.has(first)).toBe(false);
});
