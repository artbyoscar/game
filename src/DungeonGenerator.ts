import { BlockType, Dungeon, Room, Position, EnemyType, ItemType } from './types';

export class DungeonGenerator {
    private width: number;
    private height: number;
    private depth: number;
    private blocks: Uint8Array;
    private rooms: Room[] = [];

    constructor(width = 50, height = 10, depth = 50) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.blocks = new Uint8Array(width * height * depth);
    }

    generate(floor: number): Dungeon {
        this.rooms = [];
        this.blocks.fill(BlockType.STONE);

        // Generate rooms
        const numRooms = 5 + Math.floor(Math.random() * 5);

        for (let i = 0; i < numRooms; i++) {
            const roomWidth = 5 + Math.floor(Math.random() * 8);
            const roomDepth = 5 + Math.floor(Math.random() * 8);
            const x = 2 + Math.floor(Math.random() * (this.width - roomWidth - 4));
            const z = 2 + Math.floor(Math.random() * (this.depth - roomDepth - 4));

            const newRoom: Room = { x, z, width: roomWidth, depth: roomDepth };

            // Check for overlaps
            let overlaps = false;
            for (const room of this.rooms) {
                if (this.roomsOverlap(newRoom, room)) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                this.carveRoom(newRoom);

                // Connect to previous room with corridor
                if (this.rooms.length > 0) {
                    const prevRoom = this.rooms[this.rooms.length - 1];
                    this.carveCorridor(prevRoom, newRoom);
                }

                this.rooms.push(newRoom);
            }
        }

        // Add stairs
        if (this.rooms.length > 0) {
            const lastRoom = this.rooms[this.rooms.length - 1];
            const stairX = lastRoom.x + Math.floor(lastRoom.width / 2);
            const stairZ = lastRoom.z + Math.floor(lastRoom.depth / 2);
            this.setBlock(stairX, 1, stairZ, BlockType.STAIRS_DOWN);
        }

        // Add spike traps (more common on deeper floors)
        this.placeTraps(floor);

        const spawnPoint: Position = this.getSpawnPoint();
        const enemySpawns = this.generateEnemySpawns(floor);
        const itemSpawns = this.generateItemSpawns(floor);

        return {
            width: this.width,
            height: this.height,
            depth: this.depth,
            blocks: this.blocks,
            rooms: this.rooms,
            spawnPoint,
            enemySpawns,
            itemSpawns
        };
    }

    private generateEnemySpawns(floor: number): Array<{ position: Position; type: EnemyType; isElite?: boolean }> {
        const spawns: Array<{ position: Position; type: EnemyType; isElite?: boolean }> = [];

        // Boss floor every 5 floors
        const isBossFloor = floor % 5 === 0;

        // Mini-boss chance on non-boss floors (5% base + 1% per floor, capped at 20%)
        const miniBossChance = Math.min(0.05 + (floor * 0.01), 0.20);
        const shouldSpawnMiniBoss = !isBossFloor && Math.random() < miniBossChance;

        if (isBossFloor) {
            // Spawn boss in the last room
            const lastRoom = this.rooms[this.rooms.length - 1];
            const x = lastRoom.x + Math.floor(lastRoom.width / 2);
            const z = lastRoom.z + Math.floor(lastRoom.depth / 2);

            // Different boss types based on floor
            let bossType: EnemyType;
            const bossRand = Math.random();
            if (floor === 5 || (floor > 5 && bossRand < 0.4)) {
                bossType = EnemyType.BOSS_OGRE;
            } else if (bossRand < 0.7) {
                bossType = EnemyType.BOSS_DRAGON;
            } else {
                bossType = EnemyType.BOSS_LICH;
            }

            spawns.push({
                position: { x, y: 1, z },
                type: bossType
            });

            // Still spawn some regular enemies in other rooms
            for (let i = 1; i < this.rooms.length - 1; i++) {
                if (Math.random() < 0.5) { // 50% chance
                    const room = this.rooms[i];
                    const rx = room.x + 2 + Math.floor(Math.random() * (room.width - 4));
                    const rz = room.z + 2 + Math.floor(Math.random() * (room.depth - 4));

                    // Boss floor enemies are more likely to be elite
                    const isElite = Math.random() < 0.3; // 30% chance on boss floors

                    spawns.push({
                        position: { x: rx, y: 1, z: rz },
                        type: EnemyType.ORC,
                        isElite
                    });
                }
            }
        } else {
            // Mini-boss spawning
            if (shouldSpawnMiniBoss && this.rooms.length > 2) {
                // Spawn mini-boss in a random room (not first or last)
                const roomIndex = 1 + Math.floor(Math.random() * (this.rooms.length - 2));
                const room = this.rooms[roomIndex];
                const x = room.x + Math.floor(room.width / 2);
                const z = room.z + Math.floor(room.depth / 2);

                // Choose mini-boss type
                const miniBossType = Math.random() < 0.5 ?
                    EnemyType.MINI_BOSS_TROLL :
                    EnemyType.MINI_BOSS_WRAITH;

                spawns.push({
                    position: { x, y: 1, z },
                    type: miniBossType
                });

                console.log(`Mini-boss spawned: ${miniBossType} on floor ${floor}`);
            }

            // Regular enemy spawning
            // Skip first room (player spawn)
            for (let i = 1; i < this.rooms.length; i++) {
                const room = this.rooms[i];
                const numEnemies = 1 + Math.floor(Math.random() * (2 + Math.floor(floor / 3)));

                for (let j = 0; j < numEnemies; j++) {
                    const x = room.x + 2 + Math.floor(Math.random() * (room.width - 4));
                    const z = room.z + 2 + Math.floor(Math.random() * (room.depth - 4));

                    // Weighted selection based on floor
                    let type: EnemyType;
                    const rand = Math.random();

                    if (floor < 3) {
                        // Early floors: mostly goblins, some bats
                        if (rand < 0.6) type = EnemyType.GOBLIN;
                        else if (rand < 0.9) type = EnemyType.SKELETON;
                        else type = EnemyType.BAT;
                    } else if (floor < 6) {
                        // Mid floors: variety
                        if (rand < 0.3) type = EnemyType.GOBLIN;
                        else if (rand < 0.5) type = EnemyType.SKELETON;
                        else if (rand < 0.65) type = EnemyType.SKELETON_ARCHER;
                        else if (rand < 0.85) type = EnemyType.ORC;
                        else type = EnemyType.BAT;
                    } else {
                        // Late floors: harder enemies
                        if (rand < 0.15) type = EnemyType.GOBLIN;
                        else if (rand < 0.3) type = EnemyType.SKELETON;
                        else if (rand < 0.5) type = EnemyType.SKELETON_ARCHER;
                        else if (rand < 0.8) type = EnemyType.ORC;
                        else type = EnemyType.BAT;
                    }

                    // Bats spawn higher
                    const y = type === EnemyType.BAT ? 2.5 : 1;

                    // Elite chance increases with floor (10% base + 1% per floor, capped at 25%)
                    const eliteChance = Math.min(0.1 + (floor * 0.01), 0.25);
                    const isElite = Math.random() < eliteChance;

                    spawns.push({
                        position: { x, y, z },
                        type,
                        isElite
                    });
                }
            }
        }

        return spawns;
    }

    private generateItemSpawns(floor: number): Array<{ position: Position; type: ItemType }> {
        const spawns: Array<{ position: Position; type: ItemType }> = [];

        // Add items to some rooms
        for (let i = 1; i < this.rooms.length; i++) {
            if (Math.random() < 0.5) { // 50% chance for items
                const room = this.rooms[i];
                const x = room.x + 2 + Math.floor(Math.random() * (room.width - 4));
                const z = room.z + 2 + Math.floor(Math.random() * (room.depth - 4));

                const rand = Math.random();
                let type: ItemType;

                // Legendary items on floor 10+
                if (floor >= 10 && rand < 0.05) { // 5% chance for legendary
                    type = Math.random() < 0.5 ? ItemType.WEAPON_LEGENDARY_BLADE : ItemType.WEAPON_LEGENDARY_BOW;
                } else if (rand < 0.45) {
                    type = ItemType.HEALTH_POTION;
                } else if (rand < 0.6) {
                    type = ItemType.WEAPON_SWORD;
                } else if (rand < 0.75) {
                    type = ItemType.WEAPON_AXE;
                } else if (rand < 0.88 && floor >= 3) {
                    type = ItemType.WEAPON_BOW;
                } else if (floor >= 5) {
                    type = ItemType.WEAPON_STAFF;
                } else {
                    type = ItemType.WEAPON_SWORD;
                }

                spawns.push({
                    position: { x, y: 1.5, z },
                    type
                });
            }
        }

        return spawns;
    }

    private placeTraps(floor: number): void {
        // Trap chance increases with floor level (5% base + 2% per floor, capped at 35%)
        const trapChance = Math.min(0.05 + (floor * 0.02), 0.35);

        // Skip first room (player spawn) and last room (stairs)
        for (let i = 1; i < this.rooms.length - 1; i++) {
            const room = this.rooms[i];

            // Try to place a few traps in each room
            for (let attempt = 0; attempt < 5; attempt++) {
                if (Math.random() < trapChance) {
                    // Don't place traps too close to edges or doors
                    const x = room.x + 2 + Math.floor(Math.random() * (room.width - 4));
                    const z = room.z + 2 + Math.floor(Math.random() * (room.depth - 4));

                    // Only place if it's currently a floor
                    if (this.getBlock(x, 0, z) === BlockType.FLOOR) {
                        this.setBlock(x, 0, z, BlockType.SPIKE_TRAP);
                    }
                }
            }
        }
    }

    private roomsOverlap(room1: Room, room2: Room): boolean {
        return !(room1.x + room1.width + 2 < room2.x ||
                 room2.x + room2.width + 2 < room1.x ||
                 room1.z + room1.depth + 2 < room2.z ||
                 room2.z + room2.depth + 2 < room1.z);
    }

    private carveRoom(room: Room): void {
        // Floor
        for (let x = room.x; x < room.x + room.width; x++) {
            for (let z = room.z; z < room.z + room.depth; z++) {
                this.setBlock(x, 0, z, BlockType.FLOOR);
                this.setBlock(x, 1, z, BlockType.AIR);
                this.setBlock(x, 2, z, BlockType.AIR);
                this.setBlock(x, 3, z, BlockType.AIR);
                this.setBlock(x, 4, z, BlockType.CEILING);
            }
        }
    }

    private carveCorridor(room1: Room, room2: Room): void {
        const x1 = room1.x + Math.floor(room1.width / 2);
        const z1 = room1.z + Math.floor(room1.depth / 2);
        const x2 = room2.x + Math.floor(room2.width / 2);
        const z2 = room2.z + Math.floor(room2.depth / 2);

        // Horizontal corridor
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        for (let x = startX; x <= endX; x++) {
            this.setBlock(x, 0, z1, BlockType.FLOOR);
            this.setBlock(x, 1, z1, BlockType.AIR);
            this.setBlock(x, 2, z1, BlockType.AIR);
            this.setBlock(x, 3, z1, BlockType.AIR);
            this.setBlock(x, 4, z1, BlockType.CEILING);
        }

        // Vertical corridor
        const startZ = Math.min(z1, z2);
        const endZ = Math.max(z1, z2);
        for (let z = startZ; z <= endZ; z++) {
            this.setBlock(x2, 0, z, BlockType.FLOOR);
            this.setBlock(x2, 1, z, BlockType.AIR);
            this.setBlock(x2, 2, z, BlockType.AIR);
            this.setBlock(x2, 3, z, BlockType.AIR);
            this.setBlock(x2, 4, z, BlockType.CEILING);
        }
    }

    private getSpawnPoint(): Position {
        if (this.rooms.length > 0) {
            const room = this.rooms[0];
            return {
                x: room.x + Math.floor(room.width / 2),
                y: 2,
                z: room.z + Math.floor(room.depth / 2)
            };
        }
        return { x: this.width / 2, y: 2, z: this.depth / 2 };
    }

    private setBlock(x: number, y: number, z: number, type: BlockType): void {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth) {
            this.blocks[x + y * this.width + z * this.width * this.height] = type;
        }
    }

    getBlock(x: number, y: number, z: number): BlockType {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
            return BlockType.STONE;
        }
        return this.blocks[Math.floor(x) + Math.floor(y) * this.width + Math.floor(z) * this.width * this.height];
    }
}
