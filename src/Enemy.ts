import * as THREE from 'three';
import { Enemy as IEnemy, EnemyType, Position } from './types';
import { World } from './World';

export class Enemy implements IEnemy {
    id: string;
    type: EnemyType;
    position: Position;
    health: number;
    maxHealth: number;
    speed: number;
    damage: number;
    mesh: THREE.Group;
    lastAttackTime: number = 0;
    isElite: boolean = false;

    private velocity = new THREE.Vector3();
    private readonly gravity = 20.0;
    private readonly attackRange = 2.0;
    private readonly attackCooldown = 1.0; // seconds

    constructor(
        id: string,
        type: EnemyType,
        position: Position,
        private world: World,
        isElite: boolean = false
    ) {
        this.isElite = isElite;
        this.id = id;
        this.type = type;
        this.position = position;

        // Enemy stats based on type
        switch (type) {
            case EnemyType.GOBLIN:
                this.health = 30;
                this.maxHealth = 30;
                this.speed = 2.5;
                this.damage = 10;
                break;
            case EnemyType.SKELETON:
                this.health = 50;
                this.maxHealth = 50;
                this.speed = 2.0;
                this.damage = 15;
                break;
            case EnemyType.SKELETON_ARCHER:
                this.health = 40;
                this.maxHealth = 40;
                this.speed = 1.0;
                this.damage = 12;
                break;
            case EnemyType.BAT:
                this.health = 20;
                this.maxHealth = 20;
                this.speed = 3.5;
                this.damage = 8;
                break;
            case EnemyType.ORC:
                this.health = 80;
                this.maxHealth = 80;
                this.speed = 1.5;
                this.damage = 25;
                break;
            case EnemyType.BOSS_OGRE:
                this.health = 300;
                this.maxHealth = 300;
                this.speed = 1.0;
                this.damage = 40;
                break;
            case EnemyType.BOSS_DRAGON:
                this.health = 400;
                this.maxHealth = 400;
                this.speed = 1.5;
                this.damage = 50;
                break;
            case EnemyType.BOSS_LICH:
                this.health = 350;
                this.maxHealth = 350;
                this.speed = 0.8;
                this.damage = 60;
                break;
        }

        // Elite variants are stronger
        if (this.isElite) {
            this.health = Math.floor(this.health * 2);
            this.maxHealth = Math.floor(this.maxHealth * 2);
            this.damage = Math.floor(this.damage * 1.5);
            this.speed *= 1.2;
        }

        this.mesh = this.createMesh();
        this.mesh.position.set(position.x, position.y, position.z);
    }

    private createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Special handling for bat
        if (this.type === EnemyType.BAT) {
            const batGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const batMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });
            const body = new THREE.Mesh(batGeometry, batMaterial);
            body.castShadow = true;
            group.add(body);

            // Wings
            const wingGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.3);
            const leftWing = new THREE.Mesh(wingGeometry, batMaterial);
            leftWing.position.set(-0.4, 0, 0);
            group.add(leftWing);

            const rightWing = new THREE.Mesh(wingGeometry, batMaterial);
            rightWing.position.set(0.4, 0, 0);
            group.add(rightWing);

            // Health bar
            const healthBarBg = new THREE.Mesh(
                new THREE.PlaneGeometry(0.8, 0.1),
                new THREE.MeshBasicMaterial({ color: 0x330000 })
            );
            healthBarBg.position.set(0, 0.6, 0);
            group.add(healthBarBg);

            const healthBarFg = new THREE.Mesh(
                new THREE.PlaneGeometry(0.8, 0.1),
                new THREE.MeshBasicMaterial({ color: 0xFF0000 })
            );
            healthBarFg.position.set(0, 0.6, 0.01);
            healthBarFg.name = 'healthBar';
            group.add(healthBarFg);

            return group;
        }

        // Bosses are bigger
        const isBoss = this.type === EnemyType.BOSS_OGRE ||
                       this.type === EnemyType.BOSS_DRAGON ||
                       this.type === EnemyType.BOSS_LICH;
        const scale = isBoss ? 2.0 : 1.0;

        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.6 * scale, 1.2 * scale, 0.4 * scale);
        let bodyColor: number;

        switch (this.type) {
            case EnemyType.GOBLIN:
                bodyColor = 0x228B22; // Green
                break;
            case EnemyType.SKELETON:
            case EnemyType.SKELETON_ARCHER:
                bodyColor = 0xEEEEEE; // White
                break;
            case EnemyType.ORC:
                bodyColor = 0x8B4513; // Brown
                break;
            case EnemyType.BOSS_OGRE:
                bodyColor = 0x4B0082; // Indigo (purple)
                break;
            case EnemyType.BOSS_DRAGON:
                bodyColor = 0x8B0000; // Dark red
                break;
            case EnemyType.BOSS_LICH:
                bodyColor = 0x000080; // Dark blue
                break;
            default:
                bodyColor = 0xFF0000;
        }

        // Elite enemies glow gold
        if (this.isElite) {
            bodyColor = 0xFFD700; // Gold
        }

        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: bodyColor,
            emissive: this.isElite ? 0xFFD700 : 0x000000,
            emissiveIntensity: this.isElite ? 0.5 : 0
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6 * scale;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeometry = new THREE.BoxGeometry(0.5 * scale, 0.5 * scale, 0.5 * scale);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 1.45 * scale;
        head.castShadow = true;
        group.add(head);

        // Bow for skeleton archer
        if (this.type === EnemyType.SKELETON_ARCHER) {
            const bowGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.3);
            const bowMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const bow = new THREE.Mesh(bowGeometry, bowMaterial);
            bow.position.set(0.4, 0.8, 0);
            group.add(bow);
        }

        // Eyes
        const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 1.5, 0.26);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 1.5, 0.26);
        group.add(rightEye);

        // Health bar
        const healthBarBg = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x330000 })
        );
        healthBarBg.position.set(0, 2.1, 0);
        group.add(healthBarBg);

        const healthBarFg = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xFF0000 })
        );
        healthBarFg.position.set(0, 2.1, 0.01);
        healthBarFg.name = 'healthBar';
        group.add(healthBarFg);

        return group;
    }

    update(deltaTime: number, playerPosition: THREE.Vector3, currentTime: number): boolean {
        // Apply gravity
        this.velocity.y -= this.gravity * deltaTime;

        // Calculate direction to player
        const direction = new THREE.Vector3(
            playerPosition.x - this.position.x,
            0,
            playerPosition.z - this.position.z
        );
        const distanceToPlayer = direction.length();

        // Chase player if in range
        if (distanceToPlayer > this.attackRange && distanceToPlayer < 20) {
            direction.normalize();
            this.velocity.x = direction.x * this.speed;
            this.velocity.z = direction.z * this.speed;

            // Face player
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // Update position with collision
        const newPos = new THREE.Vector3(
            this.position.x + this.velocity.x * deltaTime,
            this.position.y + this.velocity.y * deltaTime,
            this.position.z + this.velocity.z * deltaTime
        );

        // Ground collision
        const groundY = this.findGround(newPos.x, newPos.z);
        if (newPos.y <= groundY) {
            newPos.y = groundY;
            this.velocity.y = 0;
        }

        // Wall collision
        if (!this.world.isBlockSolid(newPos.x, groundY + 0.5, this.position.z)) {
            this.position.x = newPos.x;
        }
        if (!this.world.isBlockSolid(this.position.x, groundY + 0.5, newPos.z)) {
            this.position.z = newPos.z;
        }
        this.position.y = newPos.y;

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        // Update health bar
        this.updateHealthBar();

        // Attack player if in range
        if (distanceToPlayer <= this.attackRange && currentTime - this.lastAttackTime >= this.attackCooldown) {
            this.lastAttackTime = currentTime;
            return true; // Signal that player should take damage
        }

        return false;
    }

    private findGround(x: number, z: number): number {
        for (let y = 10; y >= 0; y--) {
            if (this.world.isBlockSolid(x, y, z) && !this.world.isBlockSolid(x, y + 1, z)) {
                return y + 1;
            }
        }
        return 0;
    }

    private updateHealthBar(): void {
        const healthBar = this.mesh.getObjectByName('healthBar') as THREE.Mesh;
        if (healthBar) {
            const healthPercent = this.health / this.maxHealth;
            healthBar.scale.x = healthPercent;
            healthBar.position.x = -0.4 * (1 - healthPercent);
        }
    }

    takeDamage(amount: number): boolean {
        this.health -= amount;
        this.updateHealthBar();

        // Flash effect
        this.mesh.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.name !== 'healthBar') {
                const material = child.material as THREE.MeshLambertMaterial;
                const originalColor = material.color.getHex();
                material.color.setHex(0xFFFFFF);
                setTimeout(() => {
                    material.color.setHex(originalColor);
                }, 100);
            }
        });

        return this.health <= 0;
    }

    getMesh(): THREE.Group {
        return this.mesh;
    }
}
