/**
 * Class-based EventEmitter for managing custom events with pInstance-specific tracking.
 */
export class EventEmitter {
    /**
     * Map to store event listeners by pInstance and event type.
     */
    events: WeakMap<object, Map<string, Set<Function>>>;

    constructor() {
        this.events = new WeakMap();
    }

    /**
     * Registers a listener for a specified event on a specific pInstance.
     *
     * @param pInstance - The instance to associate the event with.
     * @param pEventName - The name of the event.
     * @param pListener - The function to invoke when the event is triggered.
     */
    on(pInstance: object, pEventName: string, pListener: Function): void {
        if (!this.events.has(pInstance)) {
            this.events.set(pInstance, new Map());
        }
        const instanceEvents = this.events.get(pInstance);
        if (instanceEvents) {
            if (!instanceEvents.has(pEventName)) {
                instanceEvents.set(pEventName, new Set());
            }
            instanceEvents.get(pEventName)?.add(pListener);
        }
    }

    /**
     * Unregisters a listener for a specified event on a specific pInstance.
     *
     * @param pInstance - The instance to disassociate the event from.
     * @param pEventName - The name of the event.
     * @param pListener - The function to remove from the event.
     */
    off(pInstance: object, pEventName: string, pListener: Function): void {
        if (this.events.has(pInstance)) {
            const instanceEvents = this.events.get(pInstance);
            if (instanceEvents) {
                if (instanceEvents.has(pEventName)) {
                    instanceEvents.get(pEventName)?.delete(pListener);
                    // Clean up the event if no listeners remain
                    if (instanceEvents.get(pEventName)?.size === 0) {
                        instanceEvents.delete(pEventName);
                    }
                }
                // Clean up the pInstance if no events remain
                if (instanceEvents.size === 0) {
                    this.events.delete(pInstance);
                }
            }
        }
    }

    /**
     * Triggers a specified event on a specific pInstance, invoking all registered listeners.
     *
     * @param pInstance - The instance to trigger the event on.
     * @param pEventName - The name of the event.
     * @param pData - The data to pass to the event listeners.
     */
    emit(pInstance: object, pEventName: string, pData?: any): void {
        if (this.events.has(pInstance)) {
            const instanceEvents = this.events.get(pInstance);
            if (instanceEvents?.has(pEventName)) {
                instanceEvents.get(pEventName)?.forEach((pListener) => {
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
