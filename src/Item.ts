import * as THREE from 'three';
import { Item as IItem, ItemType, Position, WeaponStats, WeaponType } from './types';

export class Item implements IItem {
    id: string;
    type: ItemType;
    position: Position;
    mesh: THREE.Mesh;

    private floatOffset = 0;
    private rotationSpeed = 2;

    constructor(id: string, type: ItemType, position: Position) {
        this.id = id;
        this.type = type;
        this.position = position;
        this.mesh = this.createMesh();
        this.mesh.position.set(position.x, position.y, position.z);
    }

    private createMesh(): THREE.Mesh {
        let geometry: THREE.BufferGeometry;
        let color: number;

        switch (this.type) {
            case ItemType.HEALTH_POTION:
                geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
                color = 0xFF0000;
                break;
            case ItemType.WEAPON_SWORD:
                geometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
                color = 0xC0C0C0;
                break;
            case ItemType.WEAPON_AXE:
                geometry = new THREE.BoxGeometry(0.3, 0.6, 0.1);
                color = 0x8B4513;
                break;
            case ItemType.WEAPON_BOW:
                geometry = new THREE.BoxGeometry(0.1, 0.7, 0.3);
                color = 0x8B4513;
                break;
            case ItemType.WEAPON_STAFF:
                geometry = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8);
                color = 0x9370DB;
                break;
            default:
                geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
                color = 0xFFFF00;
        }

        const material = new THREE.MeshLambertMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        return mesh;
    }

    update(deltaTime: number): void {
        // Float up and down
        this.floatOffset += deltaTime * 2;
        const floatY = Math.sin(this.floatOffset) * 0.2;

        // Rotate
        this.mesh.rotation.y += deltaTime * this.rotationSpeed;

        this.mesh.position.y = this.position.y + floatY;
    }

    getMesh(): THREE.Mesh {
        return this.mesh;
    }

    getEffect(): { type: string; value: number; weaponStats?: WeaponStats } {
        switch (this.type) {
            case ItemType.HEALTH_POTION:
                return { type: 'heal', value: 30 };
            case ItemType.WEAPON_SWORD:
                return {
                    type: 'weapon',
                    value: 25,
                    weaponStats: { damage: 25, range: 3.0, cooldown: 0.5, type: WeaponType.MELEE }
                };
            case ItemType.WEAPON_AXE:
                return {
                    type: 'weapon',
                    value: 35,
                    weaponStats: { damage: 35, range: 3.0, cooldown: 0.7, type: WeaponType.MELEE }
                };
            case ItemType.WEAPON_BOW:
                return {
                    type: 'weapon',
                    value: 20,
                    weaponStats: { damage: 20, range: 15.0, cooldown: 0.8, type: WeaponType.RANGED }
                };
            case ItemType.WEAPON_STAFF:
                return {
                    type: 'weapon',
                    value: 30,
                    weaponStats: { damage: 30, range: 10.0, cooldown: 1.0, type: WeaponType.MAGIC }
                };
            default:
                return { type: 'none', value: 0 };
        }
    }
}
