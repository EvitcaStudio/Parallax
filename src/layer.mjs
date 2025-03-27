import { Parallax } from './parallax.mjs';

export class Layer {
    /**
     * The configuration object of this layer.
     * @private
     * @type {Object}
     * @param {number} horizontalSpeed - The horizontal speed of the layer.
     * @param {number} verticalSpeed - The vertical speed of the layer.
     * @param {number} plane - The plane this parallax layer will occupy.
     * @param {Diob[] | MapObject[]} backgrounds - An array of instances that will serve as the background. These are automatically toggled to repeat.
     * @param {Set} instances - A set of instances currently on the layer.
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
     * @param {Object} pConfig - The configuration of the parallax layer.
     * @prop {number} [pConfig.horizontalSpeed] - The horizontal speed of the layer.
     * @prop {number} [pConfig.verticalSpeed] - The vertical speed of the layer. 
     * @prop {number} pConfig.plane - The plane this layer will occupy.
     * @prop {boolean} [pConfig.infiniteHorizontal] - Whether the layer will loop infinitely horizontally.
     * @prop {boolean} [pConfig.infiniteVertical] - Whether the layer will loop infinitely vertically.
     * @prop {number} [pConfig.cameraAnchorX] - The x position of the camera to anchor this instance to.
     * @prop {number} [pConfig.cameraAnchorY] - The y position of the camera to anchor this instance to.
     * @prop {number} [pConfig.groundY] - The y pos of the ground.
     * @param {Diob[] | MapObject[]} pConfig.backgrounds - An array of instances that will serve as the background. These are automatically toggled to repeat.
     * @prop {Diob[] | MapObject[]} pConfig.instances - The instances that will be added to the layer. 
     * @prop {Diob | MapObject} [pConfig.ground] - The ground that will be added to the layer.
     * @prop {string} [pConfig.groundMapname] - The ground mapname. 
     */
    constructor(pConfig) {
        this.updateConfigSpeed(pConfig, true);

        if (!typeof pConfig.plane === 'number') {
            Parallax.logger.prefix('Parallax-Module').warn('Expected a number for "pConfig.plane", but received:', typeof pConfig.plane, '\n Default plane of "1" used.');
        } else {
            this.config.plane = pConfig.plane;
        }

        const instanceConfig = {
            horizontalSpeed: this.config.horizontalSpeed,
            verticalSpeed: this.config.verticalSpeed,
            cameraAnchorX: pConfig.cameraAnchorX,
            cameraAnchorY: pConfig.cameraAnchorY
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
                this.add(pInstance, { ...instanceConfig, infiniteHorizontal: pConfig.infiniteHorizontal, infiniteVertical: pConfig.infiniteVertical });
            });
        }

        if (pConfig.ground) {
            pConfig.ground.plane = this.config.plane;
            this.add(pConfig.ground, { ...instanceConfig, infiniteHorizontal: pConfig.infiniteHorizontal, infiniteVertical: pConfig.infiniteVertical, ground: true, groundY: pConfig.groundY, groundMapname: pConfig.groundMapname });
        }
    }
    /**
     * Updates the configuration speed of the layer.
     * @param {Object} pConfig - The speed configuration of the parallax layer.
     * @prop {number} pConfig.horizontalSpeed - The horizontal speed of the layer.
     * @prop {number} pConfig.verticalSpeed - The vertical speed of the layer. 
     * @param {boolean} pUpdateLayerConfigOnly - If only to update the layer config and not the instance config.
     */
    updateConfigSpeed(pConfig, pUpdateLayerConfigOnly) {
        this.updateHorizontalSpeed(pConfig.horizontalSpeed, pUpdateLayerConfigOnly);
        this.updateVerticalSpeed(pConfig.verticalSpeed, pUpdateLayerConfigOnly);
    }
    /**
     * Updates the horizontal speed of this layer.
     * @param {number} pHorizontalSpeed - The new horizontal speed.
     * @param {boolean} pUpdateLayerConfigOnly - If only to update the layer config and not the instance config.
     */
    updateHorizontalSpeed(pHorizontalSpeed, pUpdateLayerConfigOnly) {
        const inValidHorizontal = pHorizontalSpeed && typeof pHorizontalSpeed !== 'number';

        if (inValidHorizontal) {
            Parallax.logger.prefix('Parallax-Module').warn('Expected a number for "pHorizontalSpeed", but received:', typeof pHorizontalSpeed);
            return
        }

        this.config.horizontalSpeed = pHorizontalSpeed;

        if (!pUpdateLayerConfigOnly) {
            const update = (pInstance) => {
                const parallaxInfo = Parallax.instanceWeakMap.get(pInstance);
                parallaxInfo.horizontalSpeed = pVerticalSpeed;
            }

            this.instances.forEach(pInstance => {
                update(pInstance);
            });
            this.backgrounds.forEach(pInstance => {
                update(pInstance);
            });
        }
    }
    /**
     * Updates the vertical speed of the layer.
     * @param {number} pVerticalSpeed - The new vertical speed. 
     * @param {boolean} pUpdateLayerConfigOnly - If only to update the layer config and not the instance config.
     */
    updateVerticalSpeed(pVerticalSpeed, pUpdateLayerConfigOnly) {
        const inValidVertical = pVerticalSpeed && typeof pVerticalSpeed !== 'number';

        if (inValidVertical) {
            Parallax.logger.prefix('Parallax-Module').warn('Expected a number for "pVerticalSpeed", but received:', typeof pVerticalSpeed);
            return
        }

        this.config.verticalSpeed = pVerticalSpeed;

        if (!pUpdateLayerConfigOnly) {
            const update = (pInstance) => {
                const parallaxInfo = Parallax.instanceWeakMap.get(pInstance);
                parallaxInfo.verticalSpeed = pVerticalSpeed;
            }

            this.instances.forEach(pInstance => {
                update(pInstance);
            });
            this.backgrounds.forEach(pInstance => {
                update(pInstance);
            });
        }
    }
    /**
     * Adds the instance to the parallax layer.
     * When using this API the instance should already be on the map.
     * The instance's 'plane' will be changed to match the plane of the layer.
     * @param {Diob} pInstance - The instance to add to the layer.
     * @param {Object} pConfig - The personal config of this instance. Akin to the parallax info passed via the `Parallax.add` API.
     * @prop {number} [pConfig.horizontalSpeed] - The horizontal speed of this instance. (This will be ignored and the layer's speed will be used.)
     * @prop {number} [pConfig.verticalSpeed] - The vertical speed of this instance. (This will be ignored and the layer's speed will be used.)
     * @prop {boolean} [pConfig.infiniteHorizontal] - Whether this instance will be treated as a horizontal background and loop seamlessly.
     * @prop {boolean} [pConfig.infiniteVertical] - Whether this instance will be treated as a vertical background and loop seamlessly.
     * @prop {number} [pConfig.cameraAnchorX] - The x position of the camera to anchor this instance to.
     * @prop {number} [pConfig.cameraAnchorY] - The y position of the camera to anchor this instance to.
     * @prop {boolean} [pConfig.ground] - If this instance is ground. (Should be infinite). Does not need to be on the map beforehand. It will be placed.
     * @prop {number} [pConfig.groundY] - The y pos of the ground.
     * @prop {string} [pConfig.groundMapname] - The ground mapname. 
     */
    add(pInstance, pConfig) {
        if (this.config.instances.has(pInstance)) return;
        this.config.instances.add(pInstance);
        const isGround = pConfig ? pConfig.ground : false;
        const groundY = isGround ? pConfig.groundY : undefined;
        const groundMapname = isGround ? pConfig.groundMapname : undefined;
        const config = {
            horizontalSpeed: this.config.horizontalSpeed,
            verticalSpeed: this.config.verticalSpeed,
            // Not using chaining operator due to the docs parser not supporting it.
            infiniteHorizontal: pConfig ? (pConfig.infiniteHorizontal ? pConfig.infiniteHorizontal : false) : false,
            infiniteVertical: pConfig ? (pConfig.infiniteVertical ? pConfig.infiniteVertical : false) : false,
            cameraAnchorX: pConfig ? (pConfig.cameraAnchorX ? pConfig.cameraAnchorX : undefined) : undefined,
            cameraAnchorY: pConfig ? (pConfig.cameraAnchorY ? pConfig.cameraAnchorY : undefined) : undefined,
            ground: isGround,
            groundY: groundY,
            groundMapname: groundMapname
        }
        pInstance.plane = this.config.plane;
        Parallax.add(pInstance, config);
    }
    /**
     * Removes the instance from the parallax layer.
     * @param {Diob} pInstance - The instance to remove from the layer.
     */
    remove(pInstance) {
        this.config.instances.delete(pInstance);
        Parallax.remove(pInstance);
    }
}