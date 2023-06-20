import type * as THREE from 'three';
export declare class Tags {
    private static tagsMap;
    private static objectTagsMap;
    static getTags(): string[];
    static getObjects(tag: string): THREE.Object3D<THREE.Event>[];
    static getWithAll(...tags: string[]): THREE.Object3D<THREE.Event>[];
    static getWithAny(...tags: string[]): THREE.Object3D<THREE.Event>[];
    static hasAny(object: THREE.Object3D, ...tags: string[]): boolean;
    static hasAll(object: THREE.Object3D, ...tags: string[]): boolean;
    static hasNone(object: THREE.Object3D, ...tags: string[]): boolean;
    static isMissingAll(object: THREE.Object3D, ...tags: string[]): boolean;
    static get(object: THREE.Object3D): string[];
    static set(object: THREE.Object3D, ...tags: string[]): void;
    static remove(object: THREE.Object3D, ...tags: string[]): void;
    static create(...tags: string[]): void;
    static delete(...tags: string[]): void;
    static clear(): void;
}
