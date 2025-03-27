/**
 * Class-based EventEmitter for managing custom events with pInstance-specific tracking.
 */
export class EventEmitter {
    /**
     * Map to store event listeners by pInstance and event type.
     * @type {WeakMap<object, Map<string, Set<Function>>>}
     */
    events;

    constructor() {
        this.events = new WeakMap();
    }

    /**
     * Registers a listener for a specified event on a specific pInstance.
     *
     * @param {object} pInstance - The instance to associate the event with.
     * @param {string} pEventName - The name of the event.
     * @param {Function} pListener - The function to invoke when the event is triggered.
     */
    on(pInstance, pEventName, pListener) {
        if (!this.events.has(pInstance)) {
            this.events.set(pInstance, new Map());
        }
        const instanceEvents = this.events.get(pInstance);
        if (!instanceEvents.has(pEventName)) {
            instanceEvents.set(pEventName, new Set());
        }
        instanceEvents.get(pEventName).add(pListener);
    }

    /**
     * Unregisters a listener for a specified event on a specific pInstance.
     *
     * @param {object} pInstance - The instance to disassociate the event from.
     * @param {string} pEventName - The name of the event.
     * @param {Function} pListener - The function to remove from the event.
     */
    off(pInstance, pEventName, pListener) {
        if (this.events.has(pInstance)) {
            const instanceEvents = this.events.get(pInstance);
            if (instanceEvents.has(pEventName)) {
                instanceEvents.get(pEventName).delete(pListener);
                // Clean up the event if no listeners remain
                if (instanceEvents.get(pEventName).size === 0) {
                    instanceEvents.delete(pEventName);
                }
            }
            // Clean up the pInstance if no events remain
            if (instanceEvents.size === 0) {
                this.events.delete(pInstance);
            }
        }
    }

    /**
     * Triggers a specified event on a specific pInstance, invoking all registered listeners.
     *
     * @param {object} pInstance - The instance to trigger the event on.
     * @param {string} pEventName - The name of the event.
     * @param {object} [pData] - The data to pass to the event listeners.
     */
    emit(pInstance, pEventName, pData) {
        if (this.events.has(pInstance)) {
            const instanceEvents = this.events.get(pInstance);
            if (instanceEvents.has(pEventName)) {
                instanceEvents.get(pEventName).forEach((pListener) => {
                    try {
                        pListener({
                            pInstance,
                            event: pEventName,
                            pData
                        });
                    } catch (error) {
                        console.error(`Error in ${pEventName} pListener:`, error);
                    }
                });
            }
        }
    }
}
