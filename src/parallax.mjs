import { Logger } from './vendor/logger.min.mjs';
import { Layer } from './layer.mjs'
import { EventEmitter } from './events.mjs';

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
     * The event emitter.
     */
    events = new EventEmitter();
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
    cameraAnchor = { x: null, y: null };
    /**
     * Whether the anchor y position is set.
     * @private
     * @type {boolean}
     */
    anchorYSet = false;
    /**
     * Whether the anchor x position is set.
     * @private
     * @type {boolean}
     */
    anchorXSet = false;
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
        return { x: null, y: null };
    }
    /**
     * Whether the last camera position is set.
     * @returns {boolean} - Whether the last camera position is set.
     */
    hasLastCamPos() {
        return this.lastCamPos.x !== null && this.lastCamPos.y !== null;
    }
    /**
     * Sets the last camera position.
     * @param {number} pX - The last x position of the camera.
     * @param {number} pY - The last y position of the camera.
     */
    setLastCamPos(pX, pY) {
        this.lastCamPos.x = pX;
        this.lastCamPos.y = pY;
    }
    /**
     * Sets the anchor position for the parallax system.
     * @param {{ x: number, y: number }} pCameraAnchor - The virtual position on the map where the layers look natural together.
     */
    setCameraAnchor(pCameraAnchor) {
        this.setCameraAnchorX(pCameraAnchor.x);
        this.setCameraAnchorY(pCameraAnchor.y);
    }
    /**
     * Sets the anchor x position for the parallax system.
     * @param {number} pXAnchor - The x position to set the anchor to.
     */
    setCameraAnchorX(pXAnchor) {
        this.cameraAnchor.x = pXAnchor;
        this.anchorXSet = true;
    }
    /**
     * Sets the anchor y position for the parallax system.
     * @param {number} pYAnchor - The y position to set the anchor to.
     */
    setCameraAnchorY(pYAnchor) {
        this.cameraAnchor.y = pYAnchor;
        this.anchorYSet = true;
    }
    /**
     * Gets the anchor position.
     * @returns {{x: number | null, y: number | null}} - The anchor position.
     */
    getCameraAnchor() {
        return { ...this.cameraAnchor };
    }
    /**
     * Gets the anchor x position.
     * @returns {number | null} - The anchor x position.
     */
    getAnchorX() {
        return this.cameraAnchor.x;
    }
    /**
     * Gets the anchor y position.
     * @returns {number | null} - The anchor x position.
     */
    getAnchorY() {
        return this.cameraAnchor.y;
    }
    /**
     * Resets the anchor position.
     */
    resetAnchor() {
        this.resetAnchorX();
        this.resetAnchorY();
    }
    /**
     * Resets the anchor x position.
     */
    resetAnchorX() {
        this.cameraAnchor.x = null;
        this.anchorXSet = false;
    }
    /**
     * Resets the anchor y position.
     */
    resetAnchorY() {
        this.cameraAnchor.y = null;
        this.anchorYSet = false;
    }
    /**
     * Whether the anchor x position is set.
     * @returns {boolean} - Whether the anchor x position is set.
     */
    isAnchorXSet() {
        return this.anchorXSet;
    }
    /**
     * Whether the anchor y position is set.
     * @returns {boolean} - Whether the anchor y position is set.
     */
    isAnchorYSet() {
        return this.anchorYSet;
    }
    /**
     * Creates two clones of the instance to loop infinitely.
     * @private
     * @param {Diob} pInstance - The instance to base the clones off of.
     * @param {boolean} pBypassEvent - Whether to bypass the onRelocated event.
     * @returns {Diob[]} - An array of the two clones.
     */
    createLoopInstances(pInstance) {
        // Create a left and right clone
        const first = VYLO.newDiob('MapObject');
        const second = VYLO.newDiob('MapObject');

        const children = [first, second];

        first.isCullable = false;
        second.isCullable = false;

        // Make the left and right clone particle look the same as the initial instance
        first.setAppearance(pInstance);
        second.setAppearance(pInstance);

        return children;
    }
    /**
     * Enables infinite looping for the horizontal plane.
     * @private
     * @param {Diob} pInstance - The instance to loop.
     */
    toggleInfiniteHorizontal(pInstance) {
        const [left, right] = this.createLoopInstances(pInstance);

        // Position the left clone
        left.x = pInstance.x - pInstance.icon.width;
        left.y = pInstance.y;
        left.mapName = pInstance.mapName;

        // Position the right clone
        right.x = pInstance.x + pInstance.icon.width;
        right.y = pInstance.y;
        right.mapName = pInstance.mapName;

        // Store the clones in a temporary array
        const children = [left, right];
        const parallaxConfig = this.instanceWeakMap.get(pInstance);

        // Store the children
        parallaxConfig.horizontalChildren = children;

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
     */
    toggleInfiniteVertical(pInstance) {
        const [top, bottom] = this.createLoopInstances(pInstance);

        // Position the left clone
        top.x = pInstance.x;
        top.y = pInstance.y - pInstance.icon.height;
        top.mapName = pInstance.mapName;

        // Position the right clone
        bottom.x = pInstance.x;
        bottom.y = pInstance.y + pInstance.icon.height;
        bottom.mapName = pInstance.mapName;

        // Store the clones in a temporary array
        const children = [top, bottom];
        const parallaxConfig = this.instanceWeakMap.get(pInstance);

        // Store the children
        parallaxConfig.verticalChildren = children;

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
        this.toggleInfiniteHorizontal(pInstance);
        this.toggleInfiniteVertical(pInstance);
    }
    /**
     * Adds an instance to the parallax system.
     * Call this first and then add your instance to the map.
     * @private
     * @param {Object} pInstance - The instance to add to the parallax system.
     * @param {Object} pConfig - The parallax info that tells this module how to control this instance.
     * @prop {number} pConfig.horizontalSpeed - The x multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @prop {number} pConfig.verticalSpeed - The y multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 1 to move with camera.
     * @prop {boolean} [pConfig.infiniteHorizontal] - Whether this instance will infiniteHorizontal endlessly.
     * @prop {boolean} [pConfig.infiniteVertical] - Whether this instance will infiniteVertical endlessly.
     * @prop {number} [pConfig.cameraAnchorX] - The x position of the camera to anchor this instance to.
     * @prop {number} [pConfig.cameraAnchorY] - The y position of the camera to anchor this instance to.
     * @prop {boolean} [pConfig.ground] - If this instance is ground.
     * @prop {number} [pConfig.groundY] - The y pos of the ground.
     * @prop {string} [pConfig.groundMapname] - The ground mapname.
     * 
     * ## The following is how the speed of the parallax multipliers are factored in.  
     (x | y) < 1 = faster behind the camera eg: (-> Player goes this way = Instance goes this way <-)  
     (x | y) > 1 faster against the camera eg: (-> Player goes this way = Instance goes this way ->)  
     (x | y) = 0 = static to the camera eg: (-> Player goes this way = Instance does nothing, and moves with the camera)   
     (x | y) = 1 = moves with the camera eg: (-> Player goes this way = Instance goes this way -> at position of camera)  
     */
    add(pInstance, pConfig) {
        if (!pInstance) {
            this.logger.prefix('Parallax-Module').error('No pInstance passed!');
            return;
        }

        if (pConfig instanceof Object) {
            if (!this.instances.has(pInstance)) {
                const { x, y, mapName } = pInstance;
                // Clone the parallax object
                const parallaxConfig = { ...pConfig };
                // Set the parallax info to the instance
                this.instanceWeakMap.set(pInstance, parallaxConfig);
                this.instances.add(pInstance);
                
                if (typeof x === 'number' && typeof y === 'number' && typeof mapName === 'string') {
                    pInstance.setPos(x, y, mapName);
                }
                this.init(pInstance, parallaxConfig);
            }
        } else {
            this.logger.prefix('Parallax-Module').error('No pConfig passed or invalid type found!');
        }
    }
    /**
     * Initializes this instance.
     * @private
     * @param {Object} pInstance - The instance to initialize.
     * @param {Object} pConfig - The parallax info that tells this module how to control this instance.
     * @prop {number} pConfig.horizontalSpeed - The x multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 0 to move with camera.
     * @prop {number} pConfig.verticalSpeed - The y multiplier for this instance. Controls how fast or slow this instance moves. -Infinity to Infinity. 0 to move with camera.
     * @prop {boolean} [pConfig.infiniteHorizontal] - Whether this instance will loop endlessly.
     * @prop {boolean} [pConfig.infiniteVertical] - Whether this instance will loop endlessly.
     * @prop {number} [pConfig.cameraAnchorX] - The x position of the camera to anchor this instance to.
     * @prop {number} [pConfig.cameraAnchorY] - The y position of the camera to anchor this instance to.
     */
    init(pInstance, pConfig) {
        if (!VYLO) {
            this.logger.prefix('Parallax-Module').error('VYLO not found! This module depends on the VYLO object being in the global name space.');
            return;
        }

        const { x, y } = this.getCamPos();

        if (!this.hasLastCamPos()) {
            this.setLastCamPos(x, y);
        }

        const { ground, groundY, groundMapname, infiniteHorizontal, infiniteVertical } = pConfig;

        if (ground) {
            pInstance.x = x - pInstance.icon.width / 2;
            pInstance.y = groundY;
            pInstance.mapName = groundMapname;
        } else {
            // Update the instance's initial position based on the anchor position
            this.updateInstance(pInstance, x, y, { x: pConfig.cameraAnchorX, y: pConfig.cameraAnchorY });
        }

        if (infiniteHorizontal && infiniteVertical) {
            this.toggleInfinitePlanes(pInstance);
        } else if (infiniteHorizontal) {
            this.toggleInfiniteHorizontal(pInstance);
        } else if (infiniteVertical) {
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
     * @param {{x: number | null, y: number | null}} [pAnchor] - The camera anchor position to use.
     */
    updateInstance(pInstance, pCameraX, pCameraY, pAnchor) {
        const { infiniteHorizontal, infiniteVertical, ground, horizontalSpeed, verticalSpeed } = this.instanceWeakMap.get(pInstance);

        // Move the instance with the camera if the parallax is set to 0
        const isBackgroundX = !ground && horizontalSpeed === 0;
        const isBackgroundY = !ground && verticalSpeed === 0;

        let lastCamPosX = this.lastCamPos.x;
        let lastCamPosY = this.lastCamPos.y;

        if (!ground) {
            if (pAnchor) {
                const x = this.getAnchorX() || pAnchor.x;
                const y = this.getAnchorY() || pAnchor.y;
    
                if (typeof x === 'number') {
                    lastCamPosX = x;
                }
    
                if (typeof y === 'number') {
                    lastCamPosY = y;
                }
            }
            
            // Position to set the instance to.
            let x;
            let y;
            if (isBackgroundX) {
                x = pCameraX - pInstance.icon.width / 2;
            } else {
                let deltaX = pCameraX - lastCamPosX;
                let distX = deltaX * horizontalSpeed;
                x = pInstance.x + distX;
            }
    
            if (isBackgroundY) {
                y = pCameraY - pInstance.icon.height / 2;
            } else {
                let deltaY = pCameraY - lastCamPosY;
                let distY = deltaY * verticalSpeed;
                y = pInstance.y + distY;
            }

            // Set the position
            pInstance.x = x;
            pInstance.y = y;
        }

        // Logic cannot be ran on static background instances as they should not loop
        if (!isBackgroundX && !isBackgroundY) {
            if (infiniteHorizontal) {
                if (lastCamPosX !== pCameraX) {
                    // The start pos + total width
                    const rightEnd = pInstance.x + pInstance.icon.width;
                    // The start pos - total width / 6
                    const leftEnd = Math.floor(pInstance.x - pInstance.icon.width / 6);

                    if (pCameraX > rightEnd) {
                        pInstance.x += pInstance.icon.width;
                    } else if (pCameraX < leftEnd) {
                        pInstance.x -= pInstance.icon.width;
                    }
                }
            }

            if (infiniteVertical) {
                if (lastCamPosY !== pCameraY) {
                    // The start pos + total height
                    const bottomEnd = pInstance.y + pInstance.icon.height;
                    // The start pos - total height / 6
                    const topEnd = Math.floor(pInstance.y - pInstance.icon.height / 6);

                    if (pCameraY > bottomEnd) {
                        pInstance.y += pInstance.icon.height;
                    } else if (pCameraY < topEnd) {
                        pInstance.y -= pInstance.icon.height;
                    }
                }
            }
        }

        const infinite = infiniteHorizontal || infiniteHorizontal;
        // If this has children, we need to update the children when it moves.

        if (pInstance._parallaxOldX !== pInstance.x || pInstance._parallaxOldY !== pInstance.y) {
            if (infinite) {
                this.handleOnRelocated(pInstance);
            }
            this.events.emit(pInstance, 'MoveEvent');
        }

        pInstance._parallaxOldX = pInstance.x; 
        pInstance._parallaxOldY = pInstance.y;
    }
    /**
     * Handles the onRelocated event for instances. Moves their children in relativity to their position.
     * @private
     * @param {Diob | MapObject} pInstance - The instance to handle the event for.
     */
    handleOnRelocated(pInstance) {
        const { verticalChildren, horizontalChildren } = this.instanceWeakMap.get(pInstance);

        // Update the children's position when the parent moves
        if (Array.isArray(verticalChildren)) {
            verticalChildren.forEach((pChild) => {
                pChild.x = pInstance.x + pChild.relativeX;
                pChild.y = pInstance.y + pChild.relativeY;
            });
        }

        if (Array.isArray(horizontalChildren)) {
            horizontalChildren.forEach((pChild) => {
                pChild.x = pInstance.x + pChild.relativeX;
                pChild.y = pInstance.y + pChild.relativeY;
            });
        }
    }
}

const Parallax = new ParallaxSingleton();
export { Parallax };