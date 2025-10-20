import * as THREE from 'three';
import { World } from './World';
import { Player } from './Player';
import { DungeonGenerator } from './DungeonGenerator';
import { Enemy } from './Enemy';
import { Item } from './Item';
import { BlockType } from './types';

class Game {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private world: World;
    private player: Player;
    private dungeonGenerator: DungeonGenerator;

    private enemies: Enemy[] = [];
    private items: Item[] = [];

    private clock = new THREE.Clock();
    private currentFloor = 1;
    private isRunning = false;
    private kills = 0;

    // UI elements
    private hudElement: HTMLElement;
    private menuElement: HTMLElement;
    private floorLevelElement: HTMLElement;
    private playerHpElement: HTMLElement;
    private playerPosElement: HTMLElement;
    private crosshairElement: HTMLElement;
    private gameCanvas: HTMLCanvasElement;

    constructor() {
        // Setup renderer
        this.gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.renderer = new THREE.WebGLRenderer({ canvas: this.gameCanvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Setup scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(0x000000, 5, 25);

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Setup lights
        this.setupLights();

        // Setup world and player
        this.world = new World(this.scene);
        this.player = new Player(this.camera, this.world);
        this.dungeonGenerator = new DungeonGenerator(50, 10, 50);

        // UI elements
        this.hudElement = document.getElementById('hud')!;
        this.menuElement = document.getElementById('menu')!;
        this.floorLevelElement = document.getElementById('floor-level')!;
        this.playerHpElement = document.getElementById('player-hp')!;
        this.playerPosElement = document.getElementById('player-pos')!;
        this.crosshairElement = document.getElementById('crosshair')!;

        // Player callbacks
        this.player.onAttack(() => this.handlePlayerAttack());
        this.player.onDamage(() => this.handlePlayerDamage());

        // Event listeners
        this.setupEventListeners();

        // Start game loop
        this.animate();
    }

    private setupLights(): void {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Player light (torch)
        const playerLight = new THREE.PointLight(0xffaa55, 1.5, 20);
        playerLight.castShadow = true;
        playerLight.shadow.camera.near = 0.1;
        playerLight.shadow.camera.far = 25;
        this.camera.add(playerLight);
        this.scene.add(this.camera);
    }

    private setupEventListeners(): void {
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Click to start
        this.menuElement.addEventListener('click', () => {
            this.startGame();
        });

        // Pointer lock change
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement !== document.body) {
                if (this.isRunning && !this.player.isDead()) {
                    this.pauseGame();
                }
            }
        });

        // E key to pick up items
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE' && this.isRunning) {
                this.checkItemPickup();
            }
        });
    }

    private startGame(): void {
        document.body.requestPointerLock();
        this.menuElement.classList.add('hidden');
        this.hudElement.classList.remove('hidden');
        this.crosshairElement.classList.remove('hidden');
        this.isRunning = true;

        // Reset player if dead
        if (this.player.isDead()) {
            this.player.health = this.player.maxHealth;
            this.currentFloor = 1;
            this.kills = 0;
        }

        // Generate first dungeon
        this.generateDungeon();
    }

    private pauseGame(): void {
        this.menuElement.classList.remove('hidden');
        this.hudElement.classList.add('hidden');
        this.crosshairElement.classList.add('hidden');
        this.isRunning = false;
    }

    private generateDungeon(): void {
        console.log(`Generating dungeon floor ${this.currentFloor}...`);

        // Clear existing entities
        this.clearEnemies();
        this.clearItems();

        const dungeon = this.dungeonGenerator.generate(this.currentFloor);
        this.world.loadDungeon(dungeon);

        // Set player spawn position
        const spawn = dungeon.spawnPoint;
        this.player.setPosition(spawn.x, spawn.y, spawn.z);

        // Spawn enemies
        let enemyId = 0;
        dungeon.enemySpawns.forEach(spawnData => {
            const enemy = new Enemy(
                `enemy_${enemyId++}`,
                spawnData.type,
                spawnData.position,
                this.world
            );
            this.enemies.push(enemy);
            this.scene.add(enemy.getMesh());
        });

        // Spawn items
        let itemId = 0;
        dungeon.itemSpawns.forEach(spawnData => {
            const item = new Item(
                `item_${itemId++}`,
                spawnData.type,
                spawnData.position
            );
            this.items.push(item);
            this.scene.add(item.getMesh());
        });

        console.log(`Dungeon generated! Spawn: ${spawn.x}, ${spawn.y}, ${spawn.z}`);
        console.log(`Enemies: ${this.enemies.length}, Items: ${this.items.length}`);
    }

    private clearEnemies(): void {
        this.enemies.forEach(enemy => {
            this.scene.remove(enemy.getMesh());
        });
        this.enemies = [];
    }

    private clearItems(): void {
        this.items.forEach(item => {
            this.scene.remove(item.getMesh());
        });
        this.items = [];
    }

    private handlePlayerAttack(): void {
        const playerPos = this.player.getPosition();
        const attackDir = this.player.getForwardDirection();
        const attackRange = this.player.getAttackRange();

        // Check if we hit any enemy
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const enemyPos = new THREE.Vector3(
                enemy.position.x,
                enemy.position.y + 1,
                enemy.position.z
            );

            const toEnemy = enemyPos.clone().sub(playerPos);
            const distance = toEnemy.length();

            if (distance <= attackRange) {
                // Check if enemy is in front of player
                const angle = attackDir.angleTo(toEnemy.normalize());
                if (angle < Math.PI / 4) { // 45 degree cone
                    const isDead = enemy.takeDamage(this.player.damage);
                    if (isDead) {
                        this.scene.remove(enemy.getMesh());
                        this.enemies.splice(i, 1);
                        this.kills++;
                        console.log(`Enemy killed! Total kills: ${this.kills}`);
                    }
                }
            }
        }
    }

    private handlePlayerDamage(): void {
        // Visual feedback handled in updateHUD with damage flash
    }

    private checkItemPickup(): void {
        const playerPos = this.player.getPosition();
        const pickupRange = 2.5;

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const itemPos = new THREE.Vector3(
                item.position.x,
                item.position.y,
                item.position.z
            );

            const distance = playerPos.distanceTo(itemPos);

            if (distance <= pickupRange) {
                const effect = item.getEffect();

                if (effect.type === 'heal') {
                    this.player.heal(effect.value);
                    console.log(`Picked up health potion! Healed ${effect.value} HP`);
                } else if (effect.type === 'weapon') {
                    this.player.setWeapon(effect.value);
                    console.log(`Picked up weapon! Damage: ${effect.value}`);
                }

                this.scene.remove(item.getMesh());
                this.items.splice(i, 1);
                break; // Only pick up one item per keypress
            }
        }
    }

    private checkStairs(): void {
        const playerPos = this.player.getPosition();
        const block = this.world.getBlock(
            Math.floor(playerPos.x),
            Math.floor(playerPos.y - 1.5),
            Math.floor(playerPos.z)
        );

        if (block === BlockType.STAIRS_DOWN) {
            this.currentFloor++;
            console.log(`Descending to floor ${this.currentFloor}...`);
            this.generateDungeon();
        }
    }

    private updateEnemies(deltaTime: number): void {
        const playerPos = this.player.getPosition();
        const currentTime = performance.now() / 1000;

        this.enemies.forEach(enemy => {
            const shouldDamagePlayer = enemy.update(deltaTime, playerPos, currentTime);

            if (shouldDamagePlayer) {
                this.player.takeDamage(enemy.damage);
                console.log(`Player took ${enemy.damage} damage! HP: ${this.player.health}`);

                if (this.player.isDead()) {
                    this.gameOver();
                }
            }
        });
    }

    private updateItems(deltaTime: number): void {
        this.items.forEach(item => {
            item.update(deltaTime);
        });
    }

    private updateHUD(): void {
        this.floorLevelElement.textContent = this.currentFloor.toString();
        this.playerHpElement.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;

        // Damage flash effect
        const damageFlash = this.player.getDamageFlash();
        if (damageFlash > 0) {
            const intensity = Math.floor((damageFlash / 0.3) * 255);
            this.gameCanvas.style.border = `4px solid rgba(255, 0, 0, ${damageFlash})`;
        } else {
            this.gameCanvas.style.border = 'none';
        }

        // Update position (optional, can remove for cleaner UI)
        const pos = this.player.getPosition();
        this.playerPosElement.textContent = `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
    }

    private gameOver(): void {
        console.log('GAME OVER!');
        this.isRunning = false;
        this.hudElement.classList.add('hidden');
        this.crosshairElement.classList.add('hidden');

        // Update menu
        this.menuElement.innerHTML = `
            <h1>GAME OVER</h1>
            <p>You died on floor ${this.currentFloor}</p>
            <p>Kills: ${this.kills}</p>
            <p style="margin-top: 20px;">Click to Restart</p>
        `;
        this.menuElement.classList.remove('hidden');

        document.exitPointerLock();
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        if (this.isRunning && !this.player.isDead()) {
            const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time

            this.player.update(deltaTime);
            this.player.updateDamageFlash(deltaTime);
            this.updateEnemies(deltaTime);
            this.updateItems(deltaTime);
            this.checkStairs();
            this.updateHUD();
        }

        this.renderer.render(this.scene, this.camera);
    };
}

// Start the game
new Game();
