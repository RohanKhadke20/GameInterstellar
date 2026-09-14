import * as THREE from 'three';

/**
 * Procedural Low-Poly Mining Vessel Constructor
 * Composes industrial geometric primitives (boxes, cylinders, cones) without external 3D asset dependencies.
 * 
 * @returns {{ group: THREE.Group, hullMaterials: THREE.Material[], emissiveMaterials: THREE.Material[] }}
 */
export function createLowPolyVesselMesh() {
  const vesselGroup = new THREE.Group();
  vesselGroup.name = 'ProceduralMiningVessel';

  const emissiveMaterials = [];
  const hullMaterials = [];

  // 1. Base Materials
  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155, // Basalt Slate
    metalness: 0.85,
    roughness: 0.25,
    flatShading: true,
  });
  hullMaterials.push(hullMaterial);

  const armorPlateMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark Navy/Slate Armor
    metalness: 0.9,
    roughness: 0.35,
    flatShading: true,
  });
  hullMaterials.push(armorPlateMaterial);

  const goldTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Industrial Yellow Hazard Trim
    metalness: 0.7,
    roughness: 0.4,
    flatShading: true,
  });
  hullMaterials.push(goldTrimMaterial);

  // Dynamic Emissive Material for thrusters & sensor beacons
  const engineEmissiveMaterial = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.2,
    toneMapped: false,
    roughness: 0.1,
  });
  emissiveMaterials.push(engineEmissiveMaterial);

  const sensorBeaconMaterial = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x22d3ee,
    emissiveIntensity: 3.0,
    toneMapped: false,
    roughness: 0.1,
  });
  emissiveMaterials.push(sensorBeaconMaterial);

  // 2. Main Central Hull Chassis
  const mainHullGeo = new THREE.BoxGeometry(0.48, 0.24, 0.95);
  const mainHull = new THREE.Mesh(mainHullGeo, hullMaterial);
  vesselGroup.add(mainHull);

  // 3. Forward Angular Bridge / Cockpit Canopy
  const canopyGeo = new THREE.ConeGeometry(0.2, 0.4, 4);
  canopyGeo.rotateX(-Math.PI / 2);
  canopyGeo.rotateY(Math.PI / 4);
  const canopy = new THREE.Mesh(canopyGeo, armorPlateMaterial);
  canopy.position.set(0, 0.08, 0.58);
  vesselGroup.add(canopy);

  // 4. Outrigger Twin Drill Nacelles (Left & Right)
  const nacelleGeo = new THREE.BoxGeometry(0.14, 0.18, 0.7);
  const drillConeGeo = new THREE.ConeGeometry(0.1, 0.28, 5);
  drillConeGeo.rotateX(Math.PI / 2);

  [-0.34, 0.34].forEach((xOffset) => {
    // Structural Wing Strut
    const strutGeo = new THREE.BoxGeometry(0.2, 0.04, 0.25);
    const strut = new THREE.Mesh(strutGeo, goldTrimMaterial);
    strut.position.set(xOffset * 0.5, 0, 0);
    vesselGroup.add(strut);

    // Nacelle Pod
    const nacelle = new THREE.Mesh(nacelleGeo, armorPlateMaterial);
    nacelle.position.set(xOffset, 0, 0.05);
    vesselGroup.add(nacelle);

    // Forward Rotary Drill Bit
    const drillBit = new THREE.Mesh(drillConeGeo, goldTrimMaterial);
    drillBit.position.set(xOffset, 0, 0.48);
    drillBit.name = 'DrillBit';
    vesselGroup.add(drillBit);

    // Dual Rear Thruster Exhaust Nozzles
    const thrusterGeo = new THREE.CylinderGeometry(0.06, 0.085, 0.16, 6);
    thrusterGeo.rotateX(Math.PI / 2);
    const thruster = new THREE.Mesh(thrusterGeo, engineEmissiveMaterial);
    thruster.position.set(xOffset, 0, -0.38);
    vesselGroup.add(thruster);
  });

  // 5. Dorsal Cargo Silo / Ore Canister
  const siloGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.45, 8);
  siloGeo.rotateX(Math.PI / 2);
  const cargoSilo = new THREE.Mesh(siloGeo, goldTrimMaterial);
  cargoSilo.position.set(0, 0.14, -0.12);
  vesselGroup.add(cargoSilo);

  // 6. Top Sensor Beacon Light
  const beaconGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const beacon = new THREE.Mesh(beaconGeo, sensorBeaconMaterial);
  beacon.position.set(0, 0.22, 0.2);
  vesselGroup.add(beacon);

  return {
    group: vesselGroup,
    hullMaterials,
    emissiveMaterials,
  };
}

/**
 * VesselRenderer - Three.js Fleet Simulation & Dynamic FX Manager
 */
export class VesselRenderer {
  /**
   * @param {THREE.Scene} scene - Parent WebGL Scene
   */
  constructor(scene) {
    this.scene = scene;
    this.vesselMap = new Map(); // id -> { group, emissiveMaterials, laserLine, laserPositions, ... }

    // Pre-allocated vector helpers for zero-GC loop execution
    this._lookTarget = new THREE.Vector3();
    this._defaultTargetOrigin = new THREE.Vector3(0, 0, 0);

    // Shared Laser Buffer Geometries & Materials
    this.laserMaterial = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
  }

  /**
   * Instantiates and registers a new vessel entity
   */
  createVesselEntity(vessel, index, total) {
    const { group, hullMaterials, emissiveMaterials } = createLowPolyVesselMesh();

    // Mining Laser Beam (Buffer Line)
    const laserPositions = new Float32Array(6); // [x1, y1, z1, x2, y2, z2]
    const laserGeometry = new THREE.BufferGeometry();
    laserGeometry.setAttribute('position', new THREE.BufferAttribute(laserPositions, 3));

    const laserLine = new THREE.Line(laserGeometry, this.laserMaterial.clone());
    laserLine.visible = false;
    this.scene.add(laserLine);

    this.scene.add(group);

    // Initial polar coordinates
    const orbitRadius = 2.8 + (index % 4) * 0.65;
    const initialAngle = (index / Math.max(1, total)) * Math.PI * 2;
    const orbitSpeed = 0.4 + (index % 3) * 0.12;

    const entity = {
      id: vessel.id,
      group,
      hullMaterials,
      emissiveMaterials,
      laserLine,
      laserPositions,
      laserGeometry,
      currentAngle: initialAngle,
      orbitRadius,
      orbitSpeed,
      currentPos: new THREE.Vector3(),
      targetPos: new THREE.Vector3(),
      status: (vessel.status || 'idle').toLowerCase(),
    };

    this.vesselMap.set(vessel.id, entity);
    return entity;
  }

  /**
   * Transient State Update: Called per animation frame via Zustand data bridge
   * 
   * @param {Array} vesselDataArray - Incoming fleet array from Zustand store
   * @param {number} delta - Frame delta time in seconds
   * @param {THREE.Vector3} [targetMiningOrigin] - Target coordinates for extraction lasers
   */
  update(vesselDataArray = [], delta = 0.016, targetMiningOrigin = null) {
    const activeIds = new Set();
    const total = vesselDataArray.length;
    const effectiveOrigin = targetMiningOrigin || this._defaultTargetOrigin;

    // 1. Synchronize Incoming Vessels
    vesselDataArray.forEach((vessel, index) => {
      const id = vessel.id || `vessel-${index}`;
      activeIds.add(id);

      let entity = this.vesselMap.get(id);
      if (!entity) {
        entity = this.createVesselEntity(vessel, index, total);
      }

      // Update status & extraction properties
      entity.status = (vessel.status || 'idle').toLowerCase();
      this.updateEmissiveTheme(entity, entity.status);

      // 2. Orbital Physics & Coordinate Interpolation
      entity.currentAngle += entity.orbitSpeed * delta;
      
      const x = Math.cos(entity.currentAngle) * entity.orbitRadius;
      const z = Math.sin(entity.currentAngle) * entity.orbitRadius;
      const y = Math.sin(entity.currentAngle * 2.0 + entity.orbitRadius) * 0.35;

      entity.group.position.set(x, y, z);

      // Reused vector for forward flight orientation (Zero GC)
      const forwardX = -Math.sin(entity.currentAngle);
      const forwardZ = Math.cos(entity.currentAngle);
      this._lookTarget.set(x + forwardX, y, z + forwardZ);
      entity.group.lookAt(this._lookTarget);

      // Subtle roll tilt based on orbital curvature
      entity.group.rotation.z = Math.sin(entity.currentAngle) * 0.15;

      // 3. Mining Laser Beam FX
      if (entity.status === 'mining') {
        entity.laserLine.visible = true;

        const posArray = entity.laserGeometry.attributes.position.array;
        
        // Beam Origin (Vessel nose tip)
        posArray[0] = x;
        posArray[1] = y;
        posArray[2] = z;

        // Beam Destination (Mining Target with vibrational micro-jitter)
        const jitter = (Math.random() - 0.5) * 0.06;
        posArray[3] = effectiveOrigin.x + jitter;
        posArray[4] = effectiveOrigin.y + jitter;
        posArray[5] = effectiveOrigin.z + jitter;

        entity.laserGeometry.attributes.position.needsUpdate = true;
      } else {
        entity.laserLine.visible = false;
      }
    });

    // 4. Prune De-spawned / Removed Vessels
    for (const [id, entity] of this.vesselMap.entries()) {
      if (!activeIds.has(id)) {
        this.removeVesselEntity(id, entity);
      }
    }
  }

  /**
   * Applies dynamic emissive colors to thrusters & lights based on status
   */
  updateEmissiveTheme(entity, status) {
    let emissiveColorHex = 0x38bdf8; // Default Cyan (Idle)
    let laserColorHex = 0x34d399; // Emerald

    if (status === 'mining') {
      emissiveColorHex = 0x10b981; // Emerald Green
      laserColorHex = 0x34d399;
    } else if (status === 'transit') {
      emissiveColorHex = 0xf59e0b; // Amber / Yellow
      laserColorHex = 0xfbbf24;
    }

    // Update Thrusters & Beacons
    entity.emissiveMaterials.forEach((mat) => {
      if (mat.emissive) {
        mat.emissive.setHex(emissiveColorHex);
      }
    });

    // Update Laser Material
    if (entity.laserLine && entity.laserLine.material) {
      entity.laserLine.material.color.setHex(laserColorHex);
    }
  }

  /**
   * Safely disposes and removes a single vessel entity
   */
  removeVesselEntity(id, entity) {
    this.scene.remove(entity.group);
    this.scene.remove(entity.laserLine);

    entity.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });

    entity.laserGeometry?.dispose();
    entity.laserLine.material?.dispose();

    this.vesselMap.delete(id);
  }

  /**
   * Strict Lifecycle Teardown
   */
  dispose() {
    for (const [id, entity] of this.vesselMap.entries()) {
      this.removeVesselEntity(id, entity);
    }
    this.vesselMap.clear();

    if (this.laserMaterial) {
      this.laserMaterial.dispose();
      this.laserMaterial = null;
    }
  }
}

export default VesselRenderer;
