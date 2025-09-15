// @ts-ignore - Third party vendor module
import { Logger } from './vendor/logger.min.mjs';
import { Layer } from './layer.js';
import { EventEmitter } from './events.js';

/**
 * Represents a camera position with x and y coordinates.
 */
export interface CameraPosition {
    x: number | null;
    y: number | null;
}

/**
 * Configuration object for parallax instances.
 */
export interface ParallaxConfig {
    horizontalSpeed: number;
    verticalSpeed: number;
    infiniteHorizontal?: boolean;
    infiniteVertical?: boolean;
    cameraAnchorX?: number;
    cameraAnchorY?: number;
    ground?: boolean;
    groundY?: number;
    groundMapname?: string;
}

/**
 * Extended configuration for parallax instances with additional internal properties.
 */
export interface ParallaxInstanceInfo extends ParallaxConfig {
    horizontalChildren?: any[];
    verticalChildren?: any[];
}

// Global VYLO interface declaration
declare global {
    interface VYLOClient {
        getViewEye(): { x: number; y: number } | null;
    }
    
    interface VYLO {
        Client: VYLOClient;
        newDiob(type: string): any;
    }
    
    var VYLO: VYLO;
}

/**
 * The ParallaxSingleton class provides the core functionality for managing parallax effects.
 * This class is typically used as a singleton instance exported as `Parallax`.
 * 
 * @example
 * ```typescript
 * import { Parallax } from 'parallax';
 * 
 * // The Parallax instance is already created and ready to use
 * Parallax.add(myInstance, config);
 * Parallax.update(cameraX, cameraY);
 * ```
 */
class ParallaxSingleton {
    /**
     * The version of the module.
     */
    version = "VERSION_REPLACE_ME";
    
    /** The logger module this module uses to log errors / logs */
    logger = new Logger();
    
    /**
     * The event emitter.
     */
    events = new EventEmitter();
    
    /**
     * The layer class.
     */
    Layer = Layer;
    
    /**
     * An set of instances that use the parallax system.
     */
    instances = new Set<any>();
    
    /**
     * Weakmap to store info on instances used in this module.
     */
    instanceWeakMap = new WeakMap<any, ParallaxInstanceInfo>();
    
    /**
     * The last position of the camera.
     */
    lastCamPos: CameraPosition = { x: null, y: null };
    
    /**
     * The virtual position on the map where the layers look natural together.
     */
    cameraAnchor: CameraPosition = { x: null, y: null };
    
    /**
     * Whether the anchor y position is set.
     */
    anchorYSet = false;
    
    /**
     * Whether the anchor x position is set.
     */
    anchorXSet = false;
    
    constructor() {
        this.logger.registerType('Parallax-Module', '#ff6600');
    }
    
    /**
     * Gets the camera position.
     * @returns The camera position.
     */
    getCamPos(): CameraPosition {
        const viewEye = VYLO.Client.getViewEye();
        if (viewEye) {
            return { x: viewEye.x, y: viewEye.y };
        }
        return { x: null, y: null };
    }
    
    /**
     * Whether the last camera position is set.
     * @returns Whether the last camera position is set.
     */
    hasLastCamPos(): boolean {
        return this.lastCamPos.x !== null && this.lastCamPos.y !== null;
    }
    
    /**
     * Sets the last camera position.
     * @param pX - The last x position of the camera.
     * @param pY - The last y position of the camera.
     */
    setLastCamPos(pX: number, pY: number): void {
        this.lastCamPos.x = pX;
        this.lastCamPos.y = pY;
    }
    
    /**
     * Sets the anchor position for the parallax system.
     * @param pCameraAnchor - The virtual position on the map where the layers look natural together.
     */
    setCameraAnchor(pCameraAnchor: CameraPosition): void {
        this.setCameraAnchorX(pCameraAnchor.x);
        this.setCameraAnchorY(pCameraAnchor.y);
    }
    
    /**
     * Sets the anchor x position for the parallax system.
     * @param pXAnchor - The x position to set the anchor to.
     */
    setCameraAnchorX(pXAnchor: number | null): void {
        this.cameraAnchor.x = pXAnchor;
        this.anchorXSet = true;
    }
    
    /**
     * Sets the anchor y position for the parallax system.
     * @param pYAnchor - The y position to set the anchor to.
     */
    setCameraAnchorY(pYAnchor: number | null): void {
        this.cameraAnchor.y = pYAnchor;
        this.anchorYSet = true;
    }
    
    /**
     * Gets the anchor position.
     * @returns The anchor position.
     */
    getCameraAnchor(): CameraPosition {
        return { ...this.cameraAnchor };
    }
    
    /**
     * Gets the anchor x position.
     * @returns The anchor x position.
     */
    getAnchorX(): number | null {
        return this.cameraAnchor.x;
    }
    
    /**
     * Gets the anchor y position.
     * @returns The anchor y position.
     */
    getAnchorY(): number | null {
        return this.cameraAnchor.y;
    }
    
    /**
     * Resets the anchor position.
     */
    resetAnchor(): void {
        this.resetAnchorX();
        this.resetAnchorY();
    }
    
    /**
     * Resets the anchor x position.
     */
    resetAnchorX(): void {
        this.cameraAnchor.x = null;
        this.anchorXSet = false;
    }
    
    /**
     * Resets the anchor y position.
     */
    resetAnchorY(): void {
        this.cameraAnchor.y = null;
        this.anchorYSet = false;
    }
    
    /**
     * Whether the anchor x position is set.
     * @returns Whether the anchor x position is set.
     */
    isAnchorXSet(): boolean {
        return this.anchorXSet;
    }
    
    /**
     * Whether the anchor y position is set.
     * @returns Whether the anchor y position is set.
     */
    isAnchorYSet(): boolean {
        return this.anchorYSet;
    }
    
    /**
     * Creates two clones of the instance to loop infinitely.
     * @param pInstance - The instance to base the clones off of.
     * @returns An array of the two clones.
     */
    createLoopInstances(pInstance: any): any[] {
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
     * @param pInstance - The instance to loop.
     */
    toggleInfiniteHorizontal(pInstance: any): void {
        const [left, right] = this.createLoopInstances(pInstance);
        const { x: scaleX } = pInstance.scale;

        // Position the left clone
        left.x = pInstance.x - pInstance.icon.width * scaleX;
        left.y = pInstance.y;
        left.mapName = pInstance.mapName;

        // Position the right clone
        right.x = pInstance.x + pInstance.icon.width * scaleX;
        right.y = pInstance.y;
        right.mapName = pInstance.mapName;

        // Store the clones in a temporary array
        const children = [left, right];
        const parallaxConfig = this.instanceWeakMap.get(pInstance);
        if (parallaxConfig) {
            // Store the children
            parallaxConfig.horizontalChildren = children;
        }

        // Loop the clones and store their relative positions to the main instance
        children.forEach((pChild) => {
            pChild.relativeX = pChild.x - pInstance.x;
            pChild.relativeY = pChild.y - pInstance.y;
        });
    }

    /**
     * Enables infinite looping for the vertical plane.
     * @param pInstance - The instance to loop.
     */
    toggleInfiniteVertical(pInstance: any): void {
        const [top, bottom] = this.createLoopInstances(pInstance);
        const { y: scaleY } = pInstance.scale;

        // Position the left clone
        top.x = pInstance.x;
        top.y = pInstance.y - pInstance.icon.height * scaleY;
        top.mapName = pInstance.mapName;

        // Position the right clone
        bottom.x = pInstance.x;
        bottom.y = pInstance.y + pInstance.icon.height * scaleY;
        bottom.mapName = pInstance.mapName;

        // Store the clones in a temporary array
        const children = [top, bottom];
        const parallaxConfig = this.instanceWeakMap.get(pInstance);
        if (parallaxConfig) {
            // Store the children
            parallaxConfig.verticalChildren = children;
        }

        // Loop the clones and store their relative positions to the main instance
        children.forEach((pChild) => {
            pChild.relativeX = pChild.x - pInstance.x;
            pChild.relativeY = pChild.y - pInstance.y;
        });
    }
    
    /**
     * Toggle infinite looping for both the horizontal and vertical planes.
     * @param pInstance - The instance to loop.
     */
    toggleInfinitePlanes(pInstance: any): void {
        this.toggleInfiniteHorizontal(pInstance);
        this.toggleInfiniteVertical(pInstance);
    }
    
    /**
     * Adds an instance to the parallax system.
     * Call this first and then add your instance to the map.
     * @param pInstance - The instance to add to the parallax system.
     * @param pConfig - The parallax info that tells this module how to control this instance.
     */
    add(pInstance: any, pConfig: ParallaxConfig): void {
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
     * @param pInstance - The instance to initialize.
     * @param pConfig - The parallax info that tells this module how to control this instance.
     */
    init(pInstance: any, pConfig: ParallaxConfig): void {
        if (!VYLO) {
            this.logger.prefix('Parallax-Module').error('VYLO not found! This module depends on the VYLO object being in the global name space.');
            return;
        }

        const { x, y } = this.getCamPos();

        if (!this.hasLastCamPos() && x !== null && y !== null) {
            this.setLastCamPos(x, y);
        }

        const { ground, groundY, groundMapname, infiniteHorizontal, infiniteVertical } = pConfig;

        if (ground && x !== null) {
            const { x: scaleX } = pInstance.scale;
            pInstance.x = x - pInstance.icon.width * scaleX / 2;
            pInstance.y = groundY;
            pInstance.mapName = groundMapname;
        } else if (x !== null && y !== null) {
            // Update the instance's initial position based on the anchor position
            this.updateInstance(pInstance, x, y, { 
                x: pConfig.cameraAnchorX ?? null, 
                y: pConfig.cameraAnchorY ?? null 
            });
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
     * @param pInstance - The instance to remove to the parallax system.
     */
    remove(pInstance: any): void {
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
     * @param pCameraX - The x position of the camera.
     * @param pCameraY - The y position of the camera.
     */
    update(pCameraX = 0, pCameraY = 0): void {
        for (const instance of this.instances) {
            this.updateInstance(instance, pCameraX, pCameraY);
        }

        this.lastCamPos.x = pCameraX;
        this.lastCamPos.y = pCameraY;
    }
    
    /**
     * Updates the instance's position based on the camera's position.
     * @param pInstance - The instance to update.
     * @param pCameraX - The x position of the camera.
     * @param pCameraY - The y position of the camera.
     * @param pAnchor - The camera anchor position to use.
     */
    updateInstance(pInstance: any, pCameraX: number, pCameraY: number, pAnchor?: CameraPosition): void {
        const parallaxConfig = this.instanceWeakMap.get(pInstance);
        if (!parallaxConfig) return;
        
        const { infiniteHorizontal, infiniteVertical, ground, horizontalSpeed, verticalSpeed } = parallaxConfig;

        // Move the instance with the camera if the parallax is set to 0
        const isBackgroundX = !ground && horizontalSpeed === 0;
        const isBackgroundY = !ground && verticalSpeed === 0;

        let lastCamPosX = this.lastCamPos.x ?? 0;
        let lastCamPosY = this.lastCamPos.y ?? 0;
        const { x: scaleX, y: scaleY } = pInstance.scale;

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
            let x: number;
            let y: number;
            if (isBackgroundX) {
                x = pCameraX - pInstance.icon.width * scaleX / 2;
            } else {
                let deltaX = pCameraX - lastCamPosX;
                let distX = deltaX * horizontalSpeed;
                x = pInstance.x + distX;
            }
    
            if (isBackgroundY) {
                y = pCameraY - pInstance.icon.height * scaleY / 2;
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
                    const rightEnd = pInstance.x + pInstance.icon.width * scaleX;
                    // The start pos - total width / 6
                    const leftEnd = Math.floor(pInstance.x - pInstance.icon.width * scaleX / 6);

                    if (pCameraX > rightEnd) {
                        pInstance.x += pInstance.icon.width * scaleX;
                    } else if (pCameraX < leftEnd) {
                        pInstance.x -= pInstance.icon.width * scaleX;
                    }
                }
            }

            if (infiniteVertical) {
                if (lastCamPosY !== pCameraY) {
                    // The start pos + total height
                    const bottomEnd = pInstance.y + pInstance.icon.height * scaleY;
                    // The start pos - total height / 6
                    const topEnd = Math.floor(pInstance.y - pInstance.icon.height * scaleY / 6);

                    if (pCameraY > bottomEnd) {
                        pInstance.y += pInstance.icon.height * scaleY;
                    } else if (pCameraY < topEnd) {
                        pInstance.y -= pInstance.icon.height * scaleY;
                    }
                }
            }
        }

        const infinite = infiniteHorizontal || infiniteVertical;
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
     * @param pInstance - The instance to handle the event for.
     */
    handleOnRelocated(pInstance: any): void {
        const parallaxConfig = this.instanceWeakMap.get(pInstance);
        if (!parallaxConfig) return;
        
        const { verticalChildren, horizontalChildren } = parallaxConfig;

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

/**
 * The main Parallax singleton instance.
 * This is the primary API for interacting with the parallax system.
 * 
 * @example
 * ```typescript
 * import { Parallax } from 'parallax';
 * 
 * // Add an instance to the parallax system
 * Parallax.add(myInstance, {
 *   horizontalSpeed: 0.5,
 *   verticalSpeed: 0.3,
 *   infiniteHorizontal: true
 * });
 * 
 * // Update the parallax system
 * Parallax.update(cameraX, cameraY);
 * ```
 */
const Parallax = new ParallaxSingleton();
export { Parallax, ParallaxSingleton };
