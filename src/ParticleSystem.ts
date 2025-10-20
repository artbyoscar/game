import * as THREE from 'three';

export enum ParticleType {
    BLOOD,
    FIRE,
    SPARK,
    HEAL,
    PICKUP,
    MAGIC
}

interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    lifetime: number;
    maxLifetime: number;
}

export class ParticleSystem {
    private scene: THREE.Scene;
    private particles: Particle[] = [];
    private particlePool: THREE.Mesh[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    emitParticles(
        position: THREE.Vector3,
        type: ParticleType,
        count: number = 10
    ): void {
        const color = this.getColorForType(type);
        const size = this.getSizeForType(type);
        const speed = this.getSpeedForType(type);

        for (let i = 0; i < count; i++) {
            const particle = this.createParticle(color, size);
            particle.position.copy(position);

            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * speed,
                Math.random() * speed * 1.5,
                (Math.random() - 0.5) * speed
            );

            const lifetime = 0.3 + Math.random() * 0.7;

            this.particles.push({
                mesh: particle,
                velocity,
                lifetime,
                maxLifetime: lifetime
            });

            this.scene.add(particle);
        }
    }

    emitBloodSplatter(position: THREE.Vector3, direction: THREE.Vector3): void {
        const count = 15;
        const color = 0x8B0000;

        for (let i = 0; i < count; i++) {
            const particle = this.createParticle(color, 0.1 + Math.random() * 0.1);
            particle.position.copy(position);

            // Splatter in the hit direction with some spread
            const spread = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            );

            const velocity = direction.clone()
                .multiplyScalar(3 + Math.random() * 3)
                .add(spread);

            this.particles.push({
                mesh: particle,
                velocity,
                lifetime: 0.5 + Math.random() * 0.5,
                maxLifetime: 0.5 + Math.random() * 0.5
            });

            this.scene.add(particle);
        }
    }

    emitExplosion(position: THREE.Vector3, color: number = 0xFF6600): void {
        const count = 30;

        for (let i = 0; i < count; i++) {
            const particle = this.createParticle(color, 0.2 + Math.random() * 0.2);
            particle.position.copy(position);

            // Spherical explosion
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 5 + Math.random() * 5;

            const velocity = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.sin(phi) * Math.sin(theta) * speed,
                Math.cos(phi) * speed
            );

            this.particles.push({
                mesh: particle,
                velocity,
                lifetime: 0.8 + Math.random() * 0.4,
                maxLifetime: 0.8 + Math.random() * 0.4
            });

            this.scene.add(particle);
        }
    }

    emitHealEffect(position: THREE.Vector3): void {
        const count = 20;
        const color = 0x00FF00;

        for (let i = 0; i < count; i++) {
            const particle = this.createParticle(color, 0.15);
            particle.position.copy(position);
            particle.position.y += Math.random() * 2 - 1;

            // Rise upward with slight spread
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 1,
                2 + Math.random() * 3,
                (Math.random() - 0.5) * 1
            );

            this.particles.push({
                mesh: particle,
                velocity,
                lifetime: 1.0 + Math.random() * 0.5,
                maxLifetime: 1.0 + Math.random() * 0.5
            });

            this.scene.add(particle);
        }
    }

    private createParticle(color: number, size: number): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 1.0
        });

        return new THREE.Mesh(geometry, material);
    }

    private getColorForType(type: ParticleType): number {
        switch (type) {
            case ParticleType.BLOOD: return 0x8B0000;
            case ParticleType.FIRE: return 0xFF4500;
            case ParticleType.SPARK: return 0xFFFF00;
            case ParticleType.HEAL: return 0x00FF00;
            case ParticleType.PICKUP: return 0xFFD700;
            case ParticleType.MAGIC: return 0x9370DB;
            default: return 0xFFFFFF;
        }
    }

    private getSizeForType(type: ParticleType): number {
        switch (type) {
            case ParticleType.BLOOD: return 0.1;
            case ParticleType.FIRE: return 0.15;
            case ParticleType.SPARK: return 0.08;
            case ParticleType.HEAL: return 0.15;
            case ParticleType.PICKUP: return 0.12;
            case ParticleType.MAGIC: return 0.2;
            default: return 0.1;
        }
    }

    private getSpeedForType(type: ParticleType): number {
        switch (type) {
            case ParticleType.BLOOD: return 4;
            case ParticleType.FIRE: return 3;
            case ParticleType.SPARK: return 6;
            case ParticleType.HEAL: return 2;
            case ParticleType.PICKUP: return 2;
            case ParticleType.MAGIC: return 5;
            default: return 3;
        }
    }

    update(deltaTime: number): void {
        const gravity = 15.0;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Apply gravity
            particle.velocity.y -= gravity * deltaTime;

            // Update position
            particle.mesh.position.addScaledVector(particle.velocity, deltaTime);

            // Update lifetime and opacity
            particle.lifetime -= deltaTime;
            const material = particle.mesh.material as THREE.MeshBasicMaterial;
            material.opacity = particle.lifetime / particle.maxLifetime;

            // Remove dead particles
            if (particle.lifetime <= 0) {
                this.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    clear(): void {
        this.particles.forEach(particle => {
            this.scene.remove(particle.mesh);
            particle.mesh.geometry.dispose();
            (particle.mesh.material as THREE.Material).dispose();
        });
        this.particles = [];
    }
}
