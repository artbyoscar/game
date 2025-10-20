import * as THREE from 'three';
import { BlockType, Dungeon } from './types';

export class World {
    private scene: THREE.Scene;
    private dungeon: Dungeon | null = null;
    private meshes: THREE.Mesh[] = [];

    // Block colors
    private readonly blockColors: Map<BlockType, number> = new Map([
        [BlockType.STONE, 0x555555],
        [BlockType.FLOOR, 0x8B7355],
        [BlockType.WALL, 0x666666],
        [BlockType.CEILING, 0x444444],
        [BlockType.DOOR, 0x8B4513],
        [BlockType.STAIRS_DOWN, 0x00AA00],
        [BlockType.STAIRS_UP, 0x0000AA],
        [BlockType.SPIKE_TRAP, 0x8B0000],
        [BlockType.TREASURE_FLOOR, 0xFFD700],
        [BlockType.CHALLENGE_FLOOR, 0xFF4500]
    ]);

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    loadDungeon(dungeon: Dungeon): void {
        // Clear existing meshes
        this.clearWorld();

        this.dungeon = dungeon;

        // Use instanced meshes for better performance
        const geometries = new Map<BlockType, THREE.BoxGeometry>();
        const materials = new Map<BlockType, THREE.MeshLambertMaterial>();

        // Create geometries and materials for each block type
        this.blockColors.forEach((color, type) => {
            geometries.set(type, new THREE.BoxGeometry(1, 1, 1));
            materials.set(type, new THREE.MeshLambertMaterial({ color }));
        });

        // Group blocks by type for instancing
        const blocksByType = new Map<BlockType, THREE.Vector3[]>();

        for (let x = 0; x < dungeon.width; x++) {
            for (let y = 0; y < dungeon.height; y++) {
                for (let z = 0; z < dungeon.depth; z++) {
                    const blockType = this.getBlock(x, y, z);

                    if (blockType === BlockType.AIR) continue;

                    // Only render if at least one face is exposed
                    if (!this.isBlockVisible(x, y, z)) continue;

                    if (!blocksByType.has(blockType)) {
                        blocksByType.set(blockType, []);
                    }
                    blocksByType.get(blockType)!.push(new THREE.Vector3(x, y, z));
                }
            }
        }

        // Create instanced meshes
        blocksByType.forEach((positions, blockType) => {
            const geometry = geometries.get(blockType)!;
            const material = materials.get(blockType)!;
            const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);

            const matrix = new THREE.Matrix4();
            positions.forEach((pos, i) => {
                matrix.setPosition(pos.x, pos.y, pos.z);
                instancedMesh.setMatrixAt(i, matrix);
            });

            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.castShadow = true;
            instancedMesh.receiveShadow = true;

            this.scene.add(instancedMesh);
            this.meshes.push(instancedMesh);
        });

        console.log(`World loaded: ${this.meshes.length} instanced meshes created`);
    }

    private isBlockVisible(x: number, y: number, z: number): boolean {
        // Check if any adjacent block is air
        return this.getBlock(x + 1, y, z) === BlockType.AIR ||
               this.getBlock(x - 1, y, z) === BlockType.AIR ||
               this.getBlock(x, y + 1, z) === BlockType.AIR ||
               this.getBlock(x, y - 1, z) === BlockType.AIR ||
               this.getBlock(x, y, z + 1) === BlockType.AIR ||
               this.getBlock(x, y, z - 1) === BlockType.AIR;
    }

    getBlock(x: number, y: number, z: number): BlockType {
        if (!this.dungeon) return BlockType.AIR;

        const { width, height, depth, blocks } = this.dungeon;

        if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) {
            return BlockType.STONE;
        }

        const index = Math.floor(x) + Math.floor(y) * width + Math.floor(z) * width * height;
        return blocks[index];
    }

    isBlockSolid(x: number, y: number, z: number): boolean {
        const block = this.getBlock(x, y, z);
        return block !== BlockType.AIR;
    }

    clearWorld(): void {
        this.meshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => mat.dispose());
            } else {
                mesh.material.dispose();
            }
        });
        this.meshes = [];
    }

    getDungeon(): Dungeon | null {
        return this.dungeon;
    }
}
