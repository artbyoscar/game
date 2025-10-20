export enum BlockType {
    AIR = 0,
    STONE = 1,
    FLOOR = 2,
    WALL = 3,
    CEILING = 4,
    DOOR = 5,
    STAIRS_DOWN = 6,
    STAIRS_UP = 7
}

export interface Position {
    x: number;
    y: number;
    z: number;
}

export interface Room {
    x: number;
    z: number;
    width: number;
    depth: number;
}

export interface Dungeon {
    width: number;
    height: number;
    depth: number;
    blocks: Uint8Array;
    rooms: Room[];
    spawnPoint: Position;
}
