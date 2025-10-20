import * as THREE from 'three';

export enum BlockType {
    AIR = 0,
    STONE = 1,
    FLOOR = 2,
    WALL = 3,
    CEILING = 4,
    DOOR = 5,
    STAIRS_DOWN = 6,
    STAIRS_UP = 7,
    SPIKE_TRAP = 8
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
    enemySpawns: Array<{ position: Position; type: EnemyType; isElite?: boolean }>;
    itemSpawns: Array<{ position: Position; type: ItemType }>;
}

export enum ItemType {
    HEALTH_POTION = 'health_potion',
    WEAPON_SWORD = 'weapon_sword',
    WEAPON_AXE = 'weapon_axe',
    WEAPON_BOW = 'weapon_bow',
    WEAPON_STAFF = 'weapon_staff',
    WEAPON_LEGENDARY_BLADE = 'weapon_legendary_blade',
    WEAPON_LEGENDARY_BOW = 'weapon_legendary_bow'
}

export interface Item {
    id: string;
    type: ItemType;
    position: Position;
    mesh?: THREE.Mesh;
}

export enum EnemyType {
    GOBLIN = 'goblin',
    SKELETON = 'skeleton',
    SKELETON_ARCHER = 'skeleton_archer',
    ORC = 'orc',
    BAT = 'bat',
    MINI_BOSS_TROLL = 'mini_boss_troll',
    MINI_BOSS_WRAITH = 'mini_boss_wraith',
    BOSS_OGRE = 'boss_ogre',
    BOSS_DRAGON = 'boss_dragon',
    BOSS_LICH = 'boss_lich'
}

export enum WeaponType {
    MELEE = 'melee',
    RANGED = 'ranged',
    MAGIC = 'magic'
}

export interface WeaponStats {
    damage: number;
    range: number;
    cooldown: number;
    type: WeaponType;
}

export interface Enemy {
    id: string;
    type: EnemyType;
    position: Position;
    health: number;
    maxHealth: number;
    speed: number;
    damage: number;
    mesh?: THREE.Group;
    lastAttackTime: number;
    isElite?: boolean;
}

export enum RoomType {
    NORMAL = 'normal',
    TREASURE = 'treasure',
    SHRINE = 'shrine',
    CHALLENGE = 'challenge'
}
