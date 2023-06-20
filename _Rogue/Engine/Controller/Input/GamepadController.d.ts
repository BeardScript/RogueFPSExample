export declare class GamepadController {
    private _upButtons;
    private _downButtons;
    private _pressedButtons;
    private _gamepad;
    deadZone: number;
    get gamepad(): Gamepad;
    constructor(gamepad: Gamepad);
    private update;
    getAxis(index: number): number;
    getButton(index: number): number;
    getButtonDown(index: number): boolean;
    getButtonUp(index: number): boolean;
}
