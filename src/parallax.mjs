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
     * @type {x: number | null, y: number | null}
     */
    lastCamPos = { x: null, y: null };
    /**
     * The virtual position on the map where the layers look natural together.
     * @private
     * @type {x: number | null, y: number | null}
     */
    anchorPos = { x: null, y: null };
    /**
     * @private
     */
	constructor() {
        this.logger.registerType('Parallax-Module', '#ff6600');
	}
    /**
     * Gets the camera position.
     * @returns {{x: number, y: number}} - The camera position.
     */
    getCamPos() {
        const viewEye = VYLO.Client.getViewEye();
        if (viewEye) {
            return { x: viewEye.x, y: viewEye.y };
        }
        return { x: 0, y: 0 };
    }
    /**
     * Sets the anchor position for the parallax system.
     * @param {{ x: number, y: number }} pAnchor - The virtual position on the map where the layers look natural together.
     */
    setAnchor(pAnchor) {
        this.setAnchorX(pAnchor.x);
        this.setAnchorY(pAnchor.y);
    }
    /**
     * Sets the anchor x position for the parallax system.
     * @param {number} pX - The x position to set the anchor to.
     */
    setAnchorX(pX) {
        this.anchorPos.x = pX;
        this.anchorXSet = true;
    }
    /**
     * Sets the anchor y position for the parallax system.
     * @param {number} pY - The y position to set the anchor to.
     */
    setAnchorY(pY) {
        this.anchorPos.y = pY;
        this.anchorYSet = true;
    }
    /**
     * Creates two clones of the instance to loop infinitely.
     * @private
     * @param {Diob} pInstance - The instance to base the clones off of.
     * @param {boolean} pBypassEvent - Whether to bypass the onRelocated event.
     * @returns {Diob[]} - An array of the two clones.
     */
    createLoopInstances(pInstance, pBypassEvent) {
        // Create a left and right clone
        const first = VYLO.newDiob('MapObject');
        const second = VYLO.newDiob('MapObject');

        const children = [first, second];

        first.isCullable = false;
        second.isCullable = false;

        // Make the left and right clone particle look the same as the initial instance
        first.setAppearance(pInstance);
        second.setAppearance(pInstance);

        if (!pBypassEvent) {
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

        return children;
    }
    /**
     * Enables infinite looping for the horizontal plane.
     * @private
     * @param {Diob} pInstance - The instance to loop.
     * @param {boolean} pBypassEvent - Whether to bypass the onRelocated event.
     */
    toggleInfiniteHorizontal(pInstance, pBypassEvent) {
        const [left, right] = this.createLoopInstances(pInstance, pBypassEvent);

        // Position the left clone
        left.x = pInstance.x - pInstance.icon.width;
        left.y = pInstance.y;

        // Position the right clone
        right.x = pInstance.x + pInstance.icon.width;
        right.y = pInstance.y;

        // Store the clones in a temporary array
        const children = [left, right];
        // Loop the clones and store their relative positions to the main instance
        children.forEach((pChild) => {
            pChild.relativeX = pChild.x - pInstance.x;
            pChild.relativeY = pChild.y - pInstance.y;
        });
    }

    /**
     * Enables infinite looping for the vertical plane.
     * @private
     * @param {Diob} pInstance - The instance to loop.
     * @param {boolean} pBypassEvent - Whether to bypass the onRelocated event.
     */
    toggleInfiniteVertical(pInstance, pBypassEvent) {
        const [top, bottom] = this.createLoopInstances(pInstance, pBypassEvent);

        // Position the left clone
        top.x = pInstance.x;
        top.y = pInstance.y - pInstance.icon.height;

        // Position the right clone
        bottom.x = pInstance.x;
        bottom.y = pInstance.y + pInstance.icon.height;

        // Store the clones in a temporary array
        const children = [top, bottom];
        // Loop the clones and store their relative positions to the main instance
        children.forEach((pChild) => {
            pChild.relativeX = pChild.x - pInstance.x;
            pChild.relativeY = pChild.y - pInstance.y;
        });
    }
    /**
     * Toggle infinite looping for both the horizontal and vertical planes.
     * @private
     * @param {Diob} pInstance - The instance to loop.
     */
    toggleInfinitePlanes(pInstance) {
        this.toggleInfiniteHorizontal(pInstance, true);
        this.toggleInfiniteVertical(pInstance);
    }
    /**
     * Adds an instance to the parallax system.
     * Call this first and then add your instance to the map.
     * @param {Object} pInstance - The instance to add to the parallax system.
     * @param {Object} pParallaxConfig - The parallax info that tells this module how to control this instance.
     * @prop {number} pParallaxConfig.x - The x multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @prop {number} pParallaxConfig.y - The y multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @prop {boolean} pParallaxConfig.infiniteHorizontal - Whether this instance will infiniteHorizontal endlessly.
     * @prop {boolean} pParallaxConfig.infiniteVertical - Whether this instance will infiniteVertical endlessly.
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
    add(pInstance, pParallaxConfig, pX, pY, pMap) {
        if (!pInstance) {
            this.logger.prefix('Parallax-Module').error('No pInstance passed!');
            return;
        }

        if (pParallaxConfig instanceof Object) {
            if (!this.instances.has(pInstance)) {
                const x = typeof pX === 'number' ? pX : pInstance.x;
                const y = typeof pY === 'number' ? pY : pInstance.y;
                const map = typeof pMap === 'string' ? pMap : pInstance.mapName;
                // Clone the parallax object
                const parallaxConfig = { ...pParallaxConfig };
                // Set the parallax info to the instance
                this.instanceWeakMap.set(pInstance, parallaxConfig);
                this.instances.add(pInstance);
                if (typeof x === 'number' && typeof y === 'number' && typeof map === 'string') {
                    pInstance.setPos(x, y, map);
                }
                this.init(pInstance, parallaxConfig);
            }
        } else {
            this.logger.prefix('Parallax-Module').error('No pParallaxConfig passed or invalid type found!');
        }
    }
    /**
     * Initializes this instance.
     * @private
     * @param {Object} pInstance - The instance to initialize.
     * @param {Object} pParallaxConfig - The parallax info that tells this module how to control this instance.
     * @prop {number} pParallaxConfig.x - The x multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 0 to move with camera.
     * @prop {number} pParallaxConfig.y - The y multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 0 to move with camera.
     * @prop {boolean} pParallaxConfig.infiniteHorizontal - Whether this instance will loop endlessly.
     * @prop {boolean} pParallaxConfig.infiniteVertical - Whether this instance will loop endlessly.
     */
    init(pInstance, pParallaxConfig) {
        if (!VYLO) {
            this.logger.prefix('Parallax-Module').error('VYLO not found! This module depends on the VYLO object being in the global name space.');
            return;
        }

        const hasLastCamPos = this.lastCamPos.x !== null && this.lastCamPos.y !== null;
        const camPos = this.getCamPos();

        if (!hasLastCamPos) {
            const lastCamX = camPos.x;
            const lastCamY = camPos.y;
            this.lastCamPos = { x: lastCamX, y: lastCamY };
        }

        // Update the instance's initial position based on the anchor position
        this.updateInstance(pInstance, camPos.x, camPos.y, this.anchorPos.x, this.anchorPos.y);

        if (pParallaxConfig.infiniteHorizontal && pParallaxConfig.infiniteVertical) {
            this.toggleInfinitePlanes(pInstance);
        } else if (pParallaxConfig.infiniteHorizontal) {
            this.toggleInfiniteHorizontal(pInstance);
        } else if (pParallaxConfig.infiniteVertical) {
            this.toggleInfiniteVertical(pInstance);
        }
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
        for (const instance of this.instances) {
            this.updateInstance(instance, pCameraX, pCameraY);
        }

        this.lastCamPos.x = pCameraX;
        this.lastCamPos.y = pCameraY;
    }
    /**
     * Updates the instance's position based on the camera's position.
     * @private
     * @param {Diob} pInstance - The instance to update.
     * @param {number} pCameraX - The x position of the camera.
     * @param {number} pCameraY - The y position of the camera.
     * @param {number} pAnchorX - The x position of the anchor.
     * @param {number} pAnchorY - The y position of the anchor.
     */
    updateInstance(pInstance, pCameraX, pCameraY, pAnchorX, pAnchorY) {
        let lastCamPosX = this.lastCamPos.x;
        let lastCamPosY = this.lastCamPos.y;

        if (pAnchorX || pAnchorX === 0) {
            lastCamPosX = pAnchorX;
        }

        if (pAnchorY || pAnchorY === 0) {
            lastCamPosY = pAnchorY;
        }

        const parallaxConfig = this.instanceWeakMap.get(pInstance);

        // Move the instance with the camera if the parallax is set to 0
        const isBackgroundX = parallaxConfig.x === 0;
        const isBackgroundY = parallaxConfig.y === 0;

        // Position to set the instance to.
        let x;
        let y;

        if (isBackgroundX) {
            x = pCameraX - pInstance.icon.width / 2;
        } else {
            let deltaX = pCameraX - lastCamPosX;
            let distX = deltaX * parallaxConfig.x;
            x = pInstance.x + distX;
        }

        if (isBackgroundY) {
            y = pCameraY - pInstance.icon.height / 2;
        } else {
            let deltaY = pCameraY - lastCamPosY;
            let distY = deltaY * parallaxConfig.y;
            y = pInstance.y + distY;
        }

        // Set the position
        pInstance.x = x;
        pInstance.y = y;

        // Logic cannot be ran on static background instances as they should not loop
        if (!isBackgroundX && !isBackgroundY) {
            if (parallaxConfig.infiniteHorizontal) {
                // The start pos + total width
                const rightEnd = pInstance.x + pInstance.icon.width;
                // The start pos - total width / 6
                const leftEnd = pInstance.x - pInstance.icon.width / 6;
                if (pCameraX > rightEnd) {
                    pInstance.x += pInstance.icon.width;
                } else if (pCameraX < leftEnd) {
                    pInstance.x -= pInstance.icon.width;
                }
            }

            if (parallaxConfig.infiniteVertical) {
                // The start pos + total height
                const bottomEnd = pInstance.x + pInstance.icon.height;
                // The start pos - total height / 6
                const topEnd = pInstance.x - pInstance.icon.height / 6;
                if (pCameraY > bottomEnd) {
                    pInstance.y += pInstance.icon.height;
                } else if (pCameraY < topEnd) {
                    pInstance.y -= pInstance.icon.height;
                }
            }
        }
    }
    /**
     * Handles the onRelocated event for instances. Moves their children in relativity to their position.
     * @private
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