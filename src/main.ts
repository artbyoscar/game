import * as THREE from 'three';
import { World } from './World';
import { Player } from './Player';
import { DungeonGenerator } from './DungeonGenerator';

class Game {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private world: World;
    private player: Player;
    private dungeonGenerator: DungeonGenerator;

    private clock = new THREE.Clock();
    private currentFloor = 1;
    private isRunning = false;

    // UI elements
    private hudElement: HTMLElement;
    private menuElement: HTMLElement;
    private floorLevelElement: HTMLElement;
    private playerHpElement: HTMLElement;
    private playerPosElement: HTMLElement;
    private crosshairElement: HTMLElement;

    constructor() {
        // Setup renderer
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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
                this.pauseGame();
            }
        });
    }

    private startGame(): void {
        document.body.requestPointerLock();
        this.menuElement.classList.add('hidden');
        this.hudElement.classList.remove('hidden');
        this.crosshairElement.classList.remove('hidden');
        this.isRunning = true;

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
        const dungeon = this.dungeonGenerator.generate(this.currentFloor);
        this.world.loadDungeon(dungeon);

        // Set player spawn position
        const spawn = dungeon.spawnPoint;
        this.player.setPosition(spawn.x, spawn.y, spawn.z);

        console.log(`Dungeon generated! Spawn: ${spawn.x}, ${spawn.y}, ${spawn.z}`);
    }

    private updateHUD(): void {
        this.floorLevelElement.textContent = this.currentFloor.toString();
        const pos = this.player.getPosition();
        this.playerPosElement.textContent = `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        if (this.isRunning) {
            const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time
            this.player.update(deltaTime);
            this.updateHUD();
        }

        this.renderer.render(this.scene, this.camera);
    };
}

// Start the game
new Game();
