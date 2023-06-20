export declare class TouchGamepad {
    private _enabled;
    private _upButtons;
    private _downButtons;
    private _pressedButtons;
    sticks: never[];
    buttons: never[];
    get enabled(): boolean;
    constructor();
    addButton(): void;
    addStick(): void;
    clear(): void;
    reset(): void;
    enable(): void;
    disable(): void;
    getButtonDown(index: number): boolean;
    getButtonPressed(index: number): boolean;
    getButtonUp(index: number): boolean;
}
