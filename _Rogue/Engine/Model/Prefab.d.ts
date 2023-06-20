import type { Object3D } from 'three';
export declare class Prefab {
    private _uuid;
    constructor(uuid: any);
    get uuid(): string;
    get path(): any;
    get name(): any;
    instantiate(parent?: Object3D): Object3D<import("three").Event>;
}
