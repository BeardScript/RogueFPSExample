import { Audio, PositionalAudio } from "three";
export declare class AudioAsset {
    private _uuid;
    private _buffer;
    userData: {
        __ASSET__: string;
    };
    constructor(params: {
        uuid: string;
        buffer?: AudioBuffer;
    });
    get uuid(): string;
    get path(): any;
    get name(): any;
    getAudio(): Audio<GainNode>;
    getPositionalAudio(): PositionalAudio;
    static fromFile(filePath: string, onProgress?: () => void, onError?: () => void): Promise<AudioAsset>;
}
