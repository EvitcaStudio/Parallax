export class Instance {
    type = 'MapObject';
    private posX = 0;
    private posY = 0;
    writes = { x: 0, y: 0 };
    mapName = 'test-map';
    icon = { width: 100, height: 80 };
    scale = { x: 1, y: 1 };
    plane = 1;
    isCullable = true;
    relativeX = 0;
    relativeY = 0;
    _parallaxOldX?: number;
    _parallaxOldY?: number;
    _parallaxChildren: Instance[] = [];
    getParallaxChildren?: () => Instance[];

    get x() { return this.posX; }
    set x(value: number) { this.writes.x++; this.posX = value; }
    get y() { return this.posY; }
    set y(value: number) { this.writes.y++; this.posY = value; }
    setPos(x: number, y: number, mapName: string) { this.x = x; this.y = y; this.mapName = mapName; }
    setAppearance(other: Instance) {
        this.icon = { ...other.icon };
        this.scale = { ...other.scale };
        this.plane = other.plane;
    }
}

export function environment(viewport = true) {
    const eye = { x: 0, y: 0 };
    const screen = { width: 640, height: 360 };
    const client = {
        getViewEye: () => eye,
        getScreenSize: () => screen,
        ...(viewport && { getPosFromScreen: (x: number, y: number) => ({
            x: eye.x + x - screen.width / 2,
            y: eye.y + y - screen.height / 2,
        }) }),
    };
    const instances: Instance[] = [];
    Object.assign(globalThis, { VYLO: { Client: client, newDiob() {
        const instance = new Instance(); instances.push(instance); return instance;
    } } });
    return { eye, screen, instances, client };
}
