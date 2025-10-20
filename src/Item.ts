import * as THREE from 'three';
import { Item as IItem, ItemType, Position } from './types';

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

    getEffect(): { type: string; value: number } {
        switch (this.type) {
            case ItemType.HEALTH_POTION:
                return { type: 'heal', value: 30 };
            case ItemType.WEAPON_SWORD:
                return { type: 'weapon', value: 25 };
            case ItemType.WEAPON_AXE:
                return { type: 'weapon', value: 35 };
            default:
                return { type: 'none', value: 0 };
        }
    }
}
