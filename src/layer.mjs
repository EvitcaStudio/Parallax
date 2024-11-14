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
     * @prop {number} pConfig.horizontalSpeed - The horizontal speed of the layer.
     * @prop {number} pConfig.verticalSpeed - The vertical speed of the layer. 
     * @prop {number} pConfig.plane - The plane this layer will occupy.
     * @param {Diob[] | MapObject[]} pConfig.backgrounds - An array of instances that will serve as the background. These are automatically toggled to repeat.
     * @prop {Diob[] | MapObject[]} pConfig.instances - The instances that will be added to the layer. 
     */
    constructor(pConfig) {
        this.updateConfigSpeed(pConfig, true);

        if (!typeof pConfig.plane === 'number') {
            Parallax.logger.prefix('Parallax-Module').warn('Expected a number for "pConfig.plane", but received:', typeof pConfig.plane, '\n Default plane of "1" used.');
        } else {
            this.config.plane = pConfig.plane;
        }

        const instanceConfig = {
            x: this.config.horizontalSpeed,
            y: this.config.verticalSpeed
        }

        if (Array.isArray(pConfig.instances)) {
            pConfig.instances.forEach(pInstance => {
                pInstance.plane = this.config.plane;
                this.add(pInstance, instanceConfig)
            });
        }

        if (Array.isArray(pConfig.backgrounds)) {
            // Backgrounds automatically loop
            instanceConfig.loop = true;
            pConfig.backgrounds.forEach(pInstance => {
                pInstance.plane = this.config.plane;
                this.add(pInstance, instanceConfig)
            });
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
                parallaxInfo.x = pVerticalSpeed;
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
                parallaxInfo.y = pVerticalSpeed;
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
     * @param {Diob} pInstance - The instance to add to the layer.
     * @param {Object} pConfig - The personal config of this instance. Akin to the parallax info passed via the `Parallax.add` API.
     * @prop {number} pConfig.x - The horizontal speed of this instance. (This will be ignored and the layer's speed will be used.)
     * @prop {number} pConfig.y - The vertical speed of this instance. (This will be ignored and the layer's speed will be used.)
     * @prop {boolean} pConfig.loop - Whether this instance will be treated as a background and loop seamlessly.
     */
    add(pInstance, pConfig) {
        this.config.instances.add(pInstance);
        Parallax.add(pInstance, pConfig);
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