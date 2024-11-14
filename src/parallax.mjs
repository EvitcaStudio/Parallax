import { Logger } from './vendor/logger.min.mjs';
import { Layer } from './layer.mjs'

class ParallaxSingleton {
	/**
	 * The version of the module.
	 */
	version = "VERSION_REPLACE_ME";
    /** The logger module this module uses to log errors / logs
     * @private
     * @type {Object}
     */
    logger = new Logger();
    /**
     * The layer class.
     * @type {Layer}
     */
    Layer = Layer;
    /**
     * An set of instances that use the parallax system.
     * @private
     * @type {Set}
     */
    instances = new Set();
    /**
     * Weakmap to store info on instances used in this module.
     * @private
     * @type {WeakMap}
     */
    instanceWeakMap = new WeakMap();
    /**
     * The last position of the camera.
     * @private
     * @type {Object}
     */
    lastCamPos = { 
        x: 0,
        y: 0
    }
    /**
     * @private
     */
	constructor() {
        this.logger.registerType('Parallax-Module', '#ff6600');
	}
    /**
     * Adds an instance to the parallax system.
     * Call this first and then add your instance to the map.
     * @param {Object} pInstance - The instance to add to the parallax system.
     * @param {Object} pConfig - The parallax info that tells this module how to control this instance.
     * @prop {number} pConfig.x - The x multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @prop {number} pConfig.y - The y multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @prop {boolean} pConfig.loop - Whether this instance will loop endlessly.
     * @param {number} [pX] - The x position this instance will start at.
     * @param {number} [pY] - The y position this instance will start at.
     * @param {string} [pMap] - The map this instance will start at.
     * 
     * ## The following is how the speed of the parallax multipliers are factored in.  
     (x | y) < 1 = faster behind the camera eg: (-> Player goes this way = Instance goes this way <-)  
     (x | y) > 1 faster against the camera eg: (-> Player goes this way = Instance goes this way ->)  
     (x | y) = 0 = static to the camera eg: (-> Player goes this way = Instance does nothing, and moves with the camera)   
     (x | y) = 1 = moves with the camera eg: (-> Player goes this way = Instance goes this way -> at position of camera)  
     */
    add(pInstance, pConfig, pX, pY, pMap) {
        if (!pInstance) {
            this.logger.prefix('Parallax-Module').error('No pInstance passed!');
            return;
        }

        if (pConfig instanceof Object) {
            if (!this.instances.has(pInstance)) {
                const x = typeof pX === 'number' ? pX : pInstance.x;
                const y = typeof pY === 'number' ? pY : pInstance.y;
                const map = typeof pMap === 'string' ? pMap : pInstance.mapName;
                // Clone the parallax object
                const parallaxInfo = { ...pConfig };
                this.init(pInstance, parallaxInfo, x, y, map);
                // Set the parallax info to the instance
                this.instanceWeakMap.set(pInstance, parallaxInfo);
                this.instances.add(pInstance);
            }
        } else {
            this.logger.prefix('Parallax-Module').error('No pConfig passed or invalid type found!');
        }
    }
    /**
     * Initializes this instance.
     * @param {Object} pInstance - The instance to initialize.
     * @param {Object} pConfig - The parallax info that tells this module how to control this instance.
     * @prop {number} pConfig.x - The x multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 0 to move with camera.
     * @prop {number} pConfig.y - The y multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 0 to move with camera.
     * @prop {boolean} pConfig.loop - Whether this instance will loop endlessly.
     * @param {number} pX - The x position this parallax will start at.
     * @param {number} pY - The y position this parallax will start at.
     * @param {string} pMap - The map this instance will start at.
     * @private
     */
    init(pInstance, pConfig, pX, pY, pMap) {
        if (!VYLO) {
            this.logger.prefix('Parallax-Module').error('VYLO not found! This module depends on the VYLO object being in the global name space.');
            return;
        }

        // If this instance is set to loop, then it needs a left and right clone
        if (pConfig.loop) {
            // Create a left and right clone
            const left = VYLO.newDiob('MapObject');
            const right = VYLO.newDiob('MapObject');

            // Make the left and right clone particle look the same as the initial instance
            left.setAppearance(pInstance);
            right.setAppearance(pInstance);

            // Force the renderer to render it, as if its placed offscreen its not rendered.
            left.setPos(pX, pY, pMap);
            right.setPos(pX, pY, pMap);

            // Position the left clone
            left.x = pX - pInstance.icon.width;
            left.y = pY;
            // Position the right clone
            right.x = pX + pInstance.icon.width;
            right.y = pY;
            // Store the clones in a temporary array
            const children = [left, right];
            // Loop the clones and store their relative positions to the main instance
            children.forEach((pChild) => {
                pChild.relativeX = pChild.x - pX;
                pChild.relativeY = pChild.y - pY;
            });

            // Do not mutate event if one is found. Call alongside it.
            const oldRelocatedEvent = pInstance.onRelocated;
            // When the main instance moves, move the clones with their relative position to it.
            if (typeof oldRelocatedEvent === 'function') {
                pInstance.onRelocated = (pX, pY) => {
                    oldRelocatedEvent.call(pInstance, pX, pY);
                    this.handleOnRelocated(pInstance, children);
                }
            } else {
                pInstance.onRelocated = (pX, pY) => {
                    this.handleOnRelocated(pInstance, children);
                }
            }
        }
        const viewEye = VYLO.Client.getViewEye();
        let lastCamX = 0;
        let lastCamY = 0;
        if (viewEye) {
            lastCamX = viewEye.x;
            lastCamY = viewEye.y;
        }
        this.lastCamPos.x = lastCamX;
        this.lastCamPos.y = lastCamY;
        pInstance.setPos(pX, pY, pMap);
    }
    /**
     * Removes an instance to the parallax system.
     * @param {Object} pInstance - The instance to remove to the parallax system.
     */
    remove(pInstance) {
        if (!pInstance) {
            this.logger.prefix('Parallax-Module').error('No pInstance passed!');
            return;
        }

        if (this.instances.has(pInstance)) {
            this.instances.delete(pInstance);
            this.instanceWeakMap.delete(pInstance);
        }
    }
    /**
     * Updates the parallax system.
     * @param {number} pCameraX - The x position of the camera.
     * @param {number} pCameraY - The y position of the camera.
     */
    update(pCameraX = 0, pCameraY = 0) {
        // The camera's x position.
        let cameraX = pCameraX;
        // The camera's x position.
        let cameraY = pCameraY;
        this.instances.forEach((pInstance) => {
            const parallaxInfo = this.instanceWeakMap.get(pInstance);

            // Move the instance with the camera if the parallax is set to 0
            const isBackgroundX = parallaxInfo.x === 0;
            const isBackgroundY = parallaxInfo.y === 0;

            // Position to set the instance to.
            let x;
            let y;

            if (isBackgroundX) {
                x = cameraX - pInstance.icon.width / 2;
            } else {
                let deltaX = cameraX - this.lastCamPos.x;
                let distX = deltaX * parallaxInfo.x;
                x = pInstance.x + distX;
            }

            if (isBackgroundY) {
                y = cameraY - pInstance.icon.height / 2;
            } else {
                let deltaY = cameraY - this.lastCamPos.y;
                let distY = deltaY * parallaxInfo.y;
                y = pInstance.y + distY;
            }

            // Set the position
            pInstance.x = x;
            pInstance.y = y;
            
            // Logic cannot be ran on background instances as they should not loop
            if (!isBackgroundX && !isBackgroundY) {
                if (parallaxInfo.loop) {
                    // The start pos + total width
                    const rightEnd = pInstance.x + pInstance.icon.width;
                    // The start pos - total width / 2
                    const leftEnd = pInstance.x - pInstance.icon.width / 6;
                    if (cameraX > rightEnd) {
                        pInstance.x += pInstance.icon.width;
                    } else if (cameraX < leftEnd) {
                        pInstance.x -= pInstance.icon.width;
                    }
                }
            }
        });
        this.lastCamPos.x = cameraX;
        this.lastCamPos.y = cameraY;
    }
    /**
     * Handles the onRelocated event for instances. Moves their children in relativity to their position.
     * @param {Diob | MapObject} pInstance - The instance to handle the event for.
     * @param {MapObject[]} pChildren - An array of children belonging to the instance.
     */
    handleOnRelocated(pInstance, pChildren) {
        // Update the children's position when the parent moves
        pChildren.forEach((pChild) => {
            pChild.x = pInstance.x + pChild.relativeX;
            pChild.y = pInstance.y + pChild.relativeY;
            pChild.mapName = pInstance.mapName;
        });
    }
}

const Parallax = new ParallaxSingleton();
export { Parallax };