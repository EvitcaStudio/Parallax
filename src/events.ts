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
        let instanceEvents = this.events.get(pInstance);
        if (!instanceEvents) {
            instanceEvents = new Map();
            this.events.set(pInstance, instanceEvents);
        }
        let listeners = instanceEvents.get(pEventName);
        if (!listeners) {
            listeners = new Set();
            instanceEvents.set(pEventName, listeners);
        }
        listeners.add(pListener);
    }

    /**
     * Unregisters a listener for a specified event on a specific pInstance.
     *
     * @param pInstance - The instance to disassociate the event from.
     * @param pEventName - The name of the event.
     * @param pListener - The function to remove from the event.
     */
    off(pInstance: object, pEventName: string, pListener: Function): void {
        const instanceEvents = this.events.get(pInstance);
        if (!instanceEvents) return;
        const listeners = instanceEvents.get(pEventName);
        if (listeners) {
            listeners.delete(pListener);
            if (listeners.size === 0) instanceEvents.delete(pEventName);
        }
        if (instanceEvents.size === 0) this.events.delete(pInstance);
    }

    /**
     * Triggers a specified event on a specific pInstance, invoking all registered listeners.
     *
     * @param pInstance - The instance to trigger the event on.
     * @param pEventName - The name of the event.
     * @param pData - The data to pass to the event listeners.
     */
    emit(pInstance: object, pEventName: string, pData?: any): void {
        const listeners = this.events.get(pInstance)?.get(pEventName);
        if (listeners) {
            listeners.forEach((pListener) => {
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
