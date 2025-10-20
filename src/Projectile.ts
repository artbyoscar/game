import * as THREE from 'three';
import { WeaponType } from './types';

export class Projectile {
    private mesh: THREE.Mesh;
    private velocity: THREE.Vector3;
    private lifetime: number;
    public damage: number;
    public weaponType: WeaponType;

    constructor(
        position: THREE.Vector3,
        direction: THREE.Vector3,
        damage: number,
        weaponType: WeaponType
    ) {
        this.damage = damage;
        this.weaponType = weaponType;
        this.velocity = direction.clone().multiplyScalar(weaponType === WeaponType.RANGED ? 20 : 15);
        this.lifetime = 3.0; // 3 seconds max

        // Create visual based on weapon type
        let geometry: THREE.BufferGeometry;
        let color: number;

        if (weaponType === WeaponType.RANGED) {
            // Arrow
            geometry = new THREE.ConeGeometry(0.05, 0.3, 8);
            color = 0x8B4513;
        } else {
            // Magic fireball
            geometry = new THREE.SphereGeometry(0.15, 8, 8);
            color = 0xFF00FF;
        }

        const material = new THREE.MeshBasicMaterial({
            color,
            emissive: color,
            emissiveIntensity: weaponType === WeaponType.MAGIC ? 0.8 : 0.2
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        // Orient arrow in direction of travel
        if (weaponType === WeaponType.RANGED) {
            this.mesh.rotation.x = Math.PI / 2;
        }
    }

    update(deltaTime: number): boolean {
        // Move projectile
        this.mesh.position.addScaledVector(this.velocity, deltaTime);

        // Update lifetime
        this.lifetime -= deltaTime;

        return this.lifetime <= 0;
    }

    getPosition(): THREE.Vector3 {
        return this.mesh.position.clone();
    }

    getMesh(): THREE.Mesh {
        return this.mesh;
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
    }
}
