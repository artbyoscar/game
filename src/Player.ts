import * as THREE from 'three';
import { World } from './World';
import { WeaponStats, WeaponType } from './types';

export class Player {
    private camera: THREE.PerspectiveCamera;
    private world: World;
    private velocity = new THREE.Vector3();
    private direction = new THREE.Vector3();
    private moveState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        canJump: false
    };

    private readonly speed = 5.0;
    private readonly jumpSpeed = 8.0;
    private readonly gravity = 20.0;
    private readonly playerHeight = 1.7;
    private readonly playerRadius = 0.3;

    private yaw = 0;
    private pitch = 0;
    private readonly mouseSensitivity = 0.002;

    // Combat and health
    public health = 100;
    public maxHealth = 100;
    public damage = 20;
    private lastAttackTime = 0;
    private attackCooldown = 0.5; // seconds
    private attackRange = 3.0;
    private damageFlashTime = 0;
    private currentWeaponType: WeaponType = WeaponType.MELEE;

    private onAttackCallback?: (weaponType: WeaponType) => void;
    private onDamageCallback?: () => void;

    constructor(camera: THREE.PerspectiveCamera, world: World) {
        this.camera = camera;
        this.world = world;

        this.setupControls();
    }

    private setupControls(): void {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': this.moveState.forward = true; break;
                case 'KeyS': this.moveState.backward = true; break;
                case 'KeyA': this.moveState.left = true; break;
                case 'KeyD': this.moveState.right = true; break;
                case 'Space':
                    if (this.moveState.canJump) {
                        this.moveState.jump = true;
                    }
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.moveState.forward = false; break;
                case 'KeyS': this.moveState.backward = false; break;
                case 'KeyA': this.moveState.left = false; break;
                case 'KeyD': this.moveState.right = false; break;
                case 'Space': this.moveState.jump = false; break;
            }
        });

        // Mouse controls
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                this.yaw -= e.movementX * this.mouseSensitivity;
                this.pitch -= e.movementY * this.mouseSensitivity;
                this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
            }
        });

        // Attack on click
        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === document.body && e.button === 0) {
                this.attack();
            }
        });
    }

    setPosition(x: number, y: number, z: number): void {
        this.camera.position.set(x, y, z);
    }

    update(deltaTime: number): void {
        // Apply gravity
        this.velocity.y -= this.gravity * deltaTime;

        // Calculate movement direction
        this.direction.set(0, 0, 0);

        if (this.moveState.forward) this.direction.z -= 1;
        if (this.moveState.backward) this.direction.z += 1;
        if (this.moveState.left) this.direction.x -= 1;
        if (this.moveState.right) this.direction.x += 1;

        if (this.direction.length() > 0) {
            this.direction.normalize();
        }

        // Apply movement relative to camera direction
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        const moveVelocity = new THREE.Vector3();
        moveVelocity.addScaledVector(forward, this.direction.z);
        moveVelocity.addScaledVector(right, this.direction.x);
        moveVelocity.normalize().multiplyScalar(this.speed);

        this.velocity.x = moveVelocity.x;
        this.velocity.z = moveVelocity.z;

        // Handle jumping
        if (this.moveState.jump && this.moveState.canJump) {
            this.velocity.y = this.jumpSpeed;
            this.moveState.canJump = false;
        }

        // Calculate new position
        const newPosition = this.camera.position.clone();
        newPosition.addScaledVector(this.velocity, deltaTime);

        // Collision detection
        newPosition.y = this.handleCollisions(newPosition);

        // Update camera
        this.camera.position.copy(newPosition);

        // Update camera rotation
        this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }

    private handleCollisions(newPosition: THREE.Vector3): number {
        const feet = newPosition.y - this.playerHeight;
        const head = newPosition.y + 0.3;

        // Check ground collision
        let onGround = false;
        for (let dx = -this.playerRadius; dx <= this.playerRadius; dx += this.playerRadius) {
            for (let dz = -this.playerRadius; dz <= this.playerRadius; dz += this.playerRadius) {
                if (this.world.isBlockSolid(
                    newPosition.x + dx,
                    feet - 0.1,
                    newPosition.z + dz
                )) {
                    onGround = true;
                    this.velocity.y = 0;
                    newPosition.y = Math.ceil(feet) + this.playerHeight;
                    break;
                }
            }
            if (onGround) break;
        }

        this.moveState.canJump = onGround;

        // Check ceiling collision
        for (let dx = -this.playerRadius; dx <= this.playerRadius; dx += this.playerRadius) {
            for (let dz = -this.playerRadius; dz <= this.playerRadius; dz += this.playerRadius) {
                if (this.world.isBlockSolid(
                    newPosition.x + dx,
                    head,
                    newPosition.z + dz
                )) {
                    this.velocity.y = Math.min(0, this.velocity.y);
                    newPosition.y = Math.floor(head) - 0.3;
                }
            }
        }

        // Check wall collisions
        const testPositions = [
            { x: this.playerRadius, z: 0 },
            { x: -this.playerRadius, z: 0 },
            { x: 0, z: this.playerRadius },
            { x: 0, z: -this.playerRadius }
        ];

        for (const offset of testPositions) {
            if (this.world.isBlockSolid(
                newPosition.x + offset.x,
                feet + 0.5,
                newPosition.z + offset.z
            )) {
                if (offset.x !== 0) newPosition.x = this.camera.position.x;
                if (offset.z !== 0) newPosition.z = this.camera.position.z;
            }
        }

        return newPosition.y;
    }

    getPosition(): THREE.Vector3 {
        return this.camera.position.clone();
    }

    attack(): void {
        const currentTime = performance.now() / 1000;
        if (currentTime - this.lastAttackTime < this.attackCooldown) {
            return;
        }

        this.lastAttackTime = currentTime;

        if (this.onAttackCallback) {
            this.onAttackCallback(this.currentWeaponType);
        }
    }

    takeDamage(amount: number): void {
        this.health = Math.max(0, this.health - amount);
        this.damageFlashTime = 0.3; // Flash for 0.3 seconds

        if (this.onDamageCallback) {
            this.onDamageCallback();
        }
    }

    heal(amount: number): void {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    setWeapon(stats: WeaponStats): void {
        this.damage = stats.damage;
        this.attackRange = stats.range;
        this.attackCooldown = stats.cooldown;
        this.currentWeaponType = stats.type;
    }

    getWeaponType(): WeaponType {
        return this.currentWeaponType;
    }

    getForwardDirection(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, -1)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)
            .applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch)
            .normalize();
    }

    getAttackRange(): number {
        return this.attackRange;
    }

    getDamageFlash(): number {
        return this.damageFlashTime;
    }

    updateDamageFlash(deltaTime: number): void {
        if (this.damageFlashTime > 0) {
            this.damageFlashTime = Math.max(0, this.damageFlashTime - deltaTime);
        }
    }

    onAttack(callback: (weaponType: WeaponType) => void): void {
        this.onAttackCallback = callback;
    }

    onDamage(callback: () => void): void {
        this.onDamageCallback = callback;
    }

    isDead(): boolean {
        return this.health <= 0;
    }
}
