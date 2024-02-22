import { Logger } from './vendor/logger.min.mjs';

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
	constructor() {
        this.logger.registerType('Parallax-Module', '#ff6600');
	}
    /**
     * An array of instances that use the parallax system.
     * @type {Array}
     */
    instances = [];
    /**
     * Weakmap to store info on instances used in this module.
     * @type {WeakMap}
     */
    instanceWeakMap = new WeakMap();
    /**
     * Adds an instance to the parallax system.
     * Call this first and then add your instance to the map.
     * @param {Object} pInstance - The instance to add to the parallax system.
     * @param {Object} pParallaxInfo - The parallax info that tells this module how to control this instance.
     * @property {number} pParallaxInfo.x - The x multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @property {number} pParallaxInfo.y - The y multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @property {boolean} pParallaxInfo.loop - Whether this instance will loop endlessly.
     * @param {number} pX - The x position this instance will start at.
     * @param {number} pY - The y position this instance will start at.
     * @param {string} pMap - The map this instance will start at.
     */
    add(pInstance, pParallaxInfo, pX, pY, pMap) {
        if (pInstance) {
            if (pParallaxInfo instanceof Object) {
                if (!this.instances.includes(pInstance)) {
                    // Clone the parallax object
                    const parallaxInfo = { ...pParallaxInfo };
                    this.init(pInstance, parallaxInfo, pX, pY, pMap);
                    // Set the parallax info to the instance
                    this.instanceWeakMap.set(pInstance, parallaxInfo);
                    this.instances.push(pInstance);
                }
            } else {
                this.logger.prefix('Parallax-Module').error('No pParallaxInfo passed or invalid type found!');
            }
        } else {
            this.logger.prefix('Parallax-Module').error('No pInstance passed!');
        }
    }
    /**
     * Initializes this instance.
     * @param {Object} pInstance - The instance to initialize.
     * @param {Object} pParallaxInfo - The parallax info that tells this module how to control this instance.
     * @property {number} pParallaxInfo.x - The x multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @property {number} pParallaxInfo.y - The y multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @property {boolean} pParallaxInfo.loop - Whether this instance will loop endlessly.
     * @param {number} pX - The x position this parallax will start at.
     * @param {number} pY - The y position this parallax will start at.
     * @param {string} pMap - The map this instance will start at.
     * @private
     */
    init(pInstance, pParallaxInfo, pX, pY, pMap) {
        if (VYLO) {
            // Set the initial position.
            pParallaxInfo._initialPos = { x: pX, y: pY };
            // If this instance is set to loop, then it needs a left and right clone
            if (pParallaxInfo.loop) {
                // Create a left and right clone
                const left = VYLO.newDiob('Particle');
                const right = VYLO.newDiob('Particle');
                // Make the left and right clone particle look the same as the initial instance
                left.setAppearance(pInstance);
                right.setAppearance(pInstance);
                // Position the left clone
                left.x = pParallaxInfo._initialPos.x - pInstance.icon.width;
                left.y = pParallaxInfo._initialPos.y;
                // Position the right clone
                right.x = pParallaxInfo._initialPos.x + pInstance.icon.width;
                right.y = pParallaxInfo._initialPos.y;
                // Store the clones in a temporary array
                const children = [left, right];
                // Loop the clones and store their relative positions to the main instance
                children.forEach((pChild) => {
                    pChild.relativeX = pChild.x - pParallaxInfo._initialPos.x;
                    pChild.relativeY = pChild.y - pParallaxInfo._initialPos.y;
                });
                // When the main instance moves, move the clones with their relative position to it.
                pInstance.onRelocated = function(pX, pY) {
                    // Update the children's position when the parent moves
                    children.forEach((pChild) => {
                        pChild.x = this.x + pChild.relativeX;
                        pChild.y = this.y + pChild.relativeY;
                        pChild.mapName = this.mapName;
                    });
                }
            }
            pInstance.x = pX;
            pInstance.y = pY;
            pInstance.mapName = pMap;
        } else {
            this.logger.prefix('Parallax-Module').error('VYLO not found! This module depends on the VYLO object being in the global name space.');
        }
    }
    /**
     * Removes an instance to the parallax system.
     * @param {Object} pInstance - The instance to remove to the parallax system.
     */
    remove(pInstance) {
        if (pInstance) {
            if (this.instances.includes(pInstance)) {
                this.instances.splice(this.instances.indexOf(pInstance), 1);
            }
        } else {
            this.logger.prefix('Parallax-Module').error('No pInstance passed!');
        }
    }
    /**
     * Updates the parallax system
     * @param {number} pCameraX - The x position of the camera.
     * @param {number} pCameraY - The y position of the camera.
     */
    update(pCameraX = 0, pCameraY = 0) {
        for (const instance of this.instances) {
            const parallaxInfo = this.instanceWeakMap.get(instance);
            // How far we moved from the start point
            const distX = pCameraX * parallaxInfo.x;
            const distY = pCameraY * parallaxInfo.y;
            // Position to set the instance to
            let x = parallaxInfo._initialPos.x + distX;
            let y = parallaxInfo._initialPos.y + distY;
            // Move the instance with the camera if the parallax is set to 1
            if (parallaxInfo.x === 1) {
                x = pCameraX - instance.icon.width / 2;
            }
            // Move the instance with the camera if the parallax is set to 1
            if (parallaxInfo.y === 1) {
                y = pCameraY - instance.icon.height / 2;
            }

            // Set the position
            instance.x = x;
            instance.y = y;

            if (parallaxInfo.loop) {
                if (parallaxInfo.x !== 1) {
                    // How far we moved relative to the camera
                    const relativeX = pCameraX * (1 - parallaxInfo.x);
                    // The start pos + total width
                    const endX = parallaxInfo._initialPos.x + instance.icon.width;
                    // The start pos - total width / 2
                    const negativeEndX = parallaxInfo._initialPos.x - instance.icon.width / 2;
                    if (relativeX > endX) {
                        parallaxInfo._initialPos.x += instance.icon.width;
                    } else if (relativeX < negativeEndX) {
                        parallaxInfo._initialPos.x -= instance.icon.width;
                    }
                }
            }
        }        
    }
}

const Parallax = new ParallaxSingleton();
export { Parallax };