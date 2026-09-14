import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

export default function ThreeCanvas() {
  const containerRef = useRef(null);
  const rotationSpeed = useStore((state) => state.rotationSpeed);
  const particleCount = useStore((state) => state.particleCount);
  const meshColor = useStore((state) => state.meshColor);
  const fleets = useStore((state) => state.fleets);
  const laserActive = useStore((state) => state.laserActive);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 1. Central Asteroid Core (Astrolith)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const geometry = new THREE.IcosahedronGeometry(1.6, 2);
    const material = new THREE.MeshStandardMaterial({
      color: meshColor,
      wireframe: true,
      emissive: 0x0f172a,
      roughness: 0.3,
      metalness: 0.9
    });
    const coreMesh = new THREE.Mesh(geometry, material);
    coreGroup.add(coreMesh);

    // Glowing Inner Plasma Core
    const innerGeo = new THREE.SphereGeometry(0.9, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      wireframe: false
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerSphere);

    // 2. Cosmic Starfield / Minerals Particles
    const particlesGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 20;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.025,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75
    });
    const starField = new THREE.Points(particlesGeo, particlesMat);
    scene.add(starField);

    // 3. Orbiting Mining Drones & Laser Beams
    const activeMiningCount = Math.max(1, fleets.filter((f) => f.status === 'mining').length);
    const droneGroup = new THREE.Group();
    scene.add(droneGroup);

    const drones = [];
    const laserLines = [];

    const droneGeo = new THREE.ConeGeometry(0.18, 0.45, 4);
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.8,
      roughness: 0.2
    });

    for (let i = 0; i < activeMiningCount; i++) {
      const droneMesh = new THREE.Mesh(droneGeo, droneMat);
      droneGroup.add(droneMesh);

      // Laser line connecting drone to asteroid core
      const laserGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0)
      ]);
      const laserMat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: laserActive ? 0.85 : 0.0
      });
      const laserLine = new THREE.Line(laserGeo, laserMat);
      scene.add(laserLine);

      drones.push({
        mesh: droneMesh,
        laser: laserLine,
        angle: (i * (2 * Math.PI)) / activeMiningCount,
        radius: 3.2 + (i % 2) * 0.5,
        speed: 0.015 + i * 0.003
      });
    }

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 3, 30);
    pointLight.position.set(4, 6, 4);
    scene.add(pointLight);

    const pinkLight = new THREE.PointLight(0xec4899, 2, 20);
    pinkLight.position.set(-4, -3, -2);
    scene.add(pinkLight);

    // 5. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rotate Asteroid
      coreMesh.rotation.x += rotationSpeed;
      coreMesh.rotation.y += rotationSpeed * 1.3;
      innerSphere.rotation.y -= rotationSpeed * 2.0;

      // Pulse inner core
      const scale = 0.9 + Math.sin(elapsed * 4) * 0.05;
      innerSphere.scale.set(scale, scale, scale);

      // Starfield subtle rotation
      starField.rotation.y += 0.0004;

      // Update Mining Drones & Laser Coordinates
      drones.forEach((drone) => {
        drone.angle += drone.speed;
        const x = Math.cos(drone.angle) * drone.radius;
        const z = Math.sin(drone.angle) * drone.radius;
        const y = Math.sin(drone.angle * 2) * 0.6;

        drone.mesh.position.set(x, y, z);
        drone.mesh.lookAt(0, 0, 0);

        // Update Laser Positions
        if (laserActive) {
          const positions = drone.laser.geometry.attributes.position.array;
          // Start point (Drone position)
          positions[0] = x;
          positions[1] = y;
          positions[2] = z;
          // End point (Surface of asteroid)
          positions[3] = 0;
          positions[4] = 0;
          positions[5] = 0;
          drone.laser.geometry.attributes.position.needsUpdate = true;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [rotationSpeed, particleCount, meshColor, fleets, laserActive]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '420px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'radial-gradient(circle at center, #111827 0%, #030712 100%)',
        border: '1px solid var(--border-color)',
        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.9), 0 10px 30px -10px rgba(99, 102, 241, 0.3)',
        position: 'relative'
      }}
    />
  );
}
