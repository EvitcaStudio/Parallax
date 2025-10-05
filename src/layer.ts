import { Parallax } from './parallax.js';

interface LayerConfig {
    horizontalSpeed?: number;
    verticalSpeed?: number;
    plane: number;
    infiniteHorizontal?: boolean;
    infiniteVertical?: boolean;
    cameraAnchorX?: number;
    cameraAnchorY?: number;
    groundY?: number;
    backgrounds?: any[];
    instances?: any[];
    ground?: any;
    groundMapname?: string;
}

interface InstanceConfig {
    horizontalSpeed: number;
    verticalSpeed: number;
    infiniteHorizontal: boolean;
    infiniteVertical: boolean;
    cameraAnchorX?: number;
    cameraAnchorY?: number;
    ground?: boolean;
    groundY?: number;
    groundMapname?: string;
}

export class Layer {
    /**
     * The configuration object of this layer.
     */
    config = {
        // Move the instance with the camera if the parallax is set to 0
        horizontalSpeed: 0,
        verticalSpeed: 0,
        plane: 1,
        backgrounds: new Set(),
        instances: new Set()
    }

    /**
     * Creates a new Parallax layer with the supplied configuration.
     * When creating a layer, all instances and backgrounds should already be on the map.
     * @param pConfig - The configuration of the parallax layer.
     */
    constructor(pConfig: LayerConfig) {
        this.updateConfigSpeed(pConfig, true);

        if (typeof pConfig.plane !== 'number') {
            Parallax.logger.prefix('Parallax-Module').warn('Expected a number for "pConfig.plane", but received:', typeof pConfig.plane, '\n Default plane of "1" used.');
        } else {
            this.config.plane = pConfig.plane;
        }

        const instanceConfig: InstanceConfig = {
            horizontalSpeed: this.config.horizontalSpeed,
            verticalSpeed: this.config.verticalSpeed,
            infiniteHorizontal: false,
            infiniteVertical: false,
            ...(pConfig.cameraAnchorX !== undefined && { cameraAnchorX: pConfig.cameraAnchorX }),
            ...(pConfig.cameraAnchorY !== undefined && { cameraAnchorY: pConfig.cameraAnchorY })
        }

        if (Array.isArray(pConfig.instances)) {
            pConfig.instances.forEach(pInstance => {
                pInstance.plane = this.config.plane;
                this.add(pInstance, instanceConfig);
            });
        }

        if (Array.isArray(pConfig.backgrounds)) {
            pConfig.backgrounds.forEach(pInstance => {
                pInstance.plane = this.config.plane;
                this.add(pInstance, { 
                    ...instanceConfig, 
                    infiniteHorizontal: pConfig.infiniteHorizontal ?? false, 
                    infiniteVertical: pConfig.infiniteVertical ?? false 
                });
            });
        }

        if (pConfig.ground) {
            pConfig.ground.plane = this.config.plane;
            this.add(pConfig.ground, { 
                ...instanceConfig, 
                infiniteHorizontal: pConfig.infiniteHorizontal ?? false, 
                infiniteVertical: pConfig.infiniteVertical ?? false, 
                ground: true, 
                ...(pConfig.groundY !== undefined && { groundY: pConfig.groundY }),
                ...(pConfig.groundMapname !== undefined && { groundMapname: pConfig.groundMapname })
            });
        }
    }

    /**
     * Updates the configuration speed of the layer.
     * @param pConfig - The speed configuration of the parallax layer.
     * @param pUpdateLayerConfigOnly - If only to update the layer config and not the instance config.
     */
    updateConfigSpeed(pConfig: LayerConfig, pUpdateLayerConfigOnly: boolean): void {
        this.updateHorizontalSpeed(pConfig.horizontalSpeed, pUpdateLayerConfigOnly);
        this.updateVerticalSpeed(pConfig.verticalSpeed, pUpdateLayerConfigOnly);
    }

    /**
     * Updates the horizontal speed of this layer.
     * @param pHorizontalSpeed - The new horizontal speed.
     * @param pUpdateLayerConfigOnly - If only to update the layer config and not the instance config.
     */
    updateHorizontalSpeed(pHorizontalSpeed: number | undefined, pUpdateLayerConfigOnly: boolean): void {
        const inValidHorizontal = pHorizontalSpeed && typeof pHorizontalSpeed !== 'number';

        if (inValidHorizontal) {
            Parallax.logger.prefix('Parallax-Module').warn('Expected a number for "pHorizontalSpeed", but received:', typeof pHorizontalSpeed);
            return
        }

        if (pHorizontalSpeed !== undefined) {
            this.config.horizontalSpeed = pHorizontalSpeed;
        }

        if (!pUpdateLayerConfigOnly) {
            const update = (pInstance: any) => {
                const parallaxInfo = Parallax.instanceWeakMap.get(pInstance);
                if (parallaxInfo && pHorizontalSpeed !== undefined) {
                    parallaxInfo.horizontalSpeed = pHorizontalSpeed;
                }
            }

            this.config.instances.forEach(pInstance => {
                update(pInstance);
            });
            this.config.backgrounds.forEach(pInstance => {
                update(pInstance);
            });
        }
    }

    /**
     * Updates the vertical speed of the layer.
     * @param pVerticalSpeed - The new vertical speed. 
     * @param pUpdateLayerConfigOnly - If only to update the layer config and not the instance config.
     */
    updateVerticalSpeed(pVerticalSpeed: number | undefined, pUpdateLayerConfigOnly: boolean): void {
        const inValidVertical = pVerticalSpeed && typeof pVerticalSpeed !== 'number';

        if (inValidVertical) {
            Parallax.logger.prefix('Parallax-Module').warn('Expected a number for "pVerticalSpeed", but received:', typeof pVerticalSpeed);
            return
        }

        if (pVerticalSpeed !== undefined) {
            this.config.verticalSpeed = pVerticalSpeed;
        }

        if (!pUpdateLayerConfigOnly) {
            const update = (pInstance: any) => {
                const parallaxInfo = Parallax.instanceWeakMap.get(pInstance);
                if (parallaxInfo && pVerticalSpeed !== undefined) {
                    parallaxInfo.verticalSpeed = pVerticalSpeed;
                }
            }

            this.config.instances.forEach(pInstance => {
                update(pInstance);
            });
            this.config.backgrounds.forEach(pInstance => {
                update(pInstance);
            });
        }
    }

    /**
     * Adds the instance to the parallax layer.
     * When using this API the instance should already be on the map.
     * The instance's 'plane' will be changed to match the plane of the layer.
     * @param pInstance - The instance to add to the layer.
     * @param pConfig - The personal config of this instance. Akin to the parallax info passed via the `Parallax.add` API.
     */
    add(pInstance: any, pConfig?: InstanceConfig): void {
        if (this.config.instances.has(pInstance)) return;
        this.config.instances.add(pInstance);
        const isGround = pConfig?.ground ?? false;
        const groundY = isGround ? pConfig?.groundY : undefined;
        const groundMapname = isGround ? pConfig?.groundMapname : undefined;
        const config: InstanceConfig = {
            horizontalSpeed: this.config.horizontalSpeed,
            verticalSpeed: this.config.verticalSpeed,
            // Not using chaining operator due to the docs parser not supporting it.
            infiniteHorizontal: pConfig?.infiniteHorizontal ?? false,
            infiniteVertical: pConfig?.infiniteVertical ?? false,
            ...(pConfig?.cameraAnchorX !== undefined && { cameraAnchorX: pConfig.cameraAnchorX }),
            ...(pConfig?.cameraAnchorY !== undefined && { cameraAnchorY: pConfig.cameraAnchorY }),
            ground: isGround,
            ...(groundY !== undefined && { groundY }),
            ...(groundMapname !== undefined && { groundMapname })
        }
        pInstance.plane = this.config.plane;
        Parallax.add(pInstance, config);
    }

    /**
     * Gets all instances currently in this parallax layer.
     * @returns All instances currently in this parallax layer.
     */
    getInstances(): any[] {
        return Array.from(this.config.instances);
    }

    /**
     * Gets all backgrounds currently in this parallax layer.
     * @returns All backgrounds currently in this parallax layer.
     */
    getBackgrounds(): any[] {
        return Array.from(this.config.backgrounds);
    }

    /**
     * Removes the instance from the parallax layer.
     * @param pInstance - The instance to remove from the layer.
     */
    remove(pInstance: any): void {
        this.config.instances.delete(pInstance);
        Parallax.remove(pInstance);
    }
}
