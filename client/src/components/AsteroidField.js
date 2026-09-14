import * as THREE from 'three';

/**
 * Fast, deterministic 32-bit PRNG (Mulberry32)
 * Produces identical floating-point sequences [0, 1) for a given integer seed.
 */
function createPRNG(seed) {
  let s = (typeof seed === 'number' ? seed : hashStringToSeed(String(seed))) >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * AsteroidField - High-Performance Procedural Instanced Asteroid Cloud
 * 
 * Performance & Architecture Directives:
 * 1. Instanced Rendering: Uses THREE.InstancedMesh for single-draw-call rendering of 200+ asteroids.
 * 2. Deterministic Procedural Generation: Hash-based PRNG ensures exact reproducible placements per sector.
 * 3. Algorithmic Mesh Distortion: Native low-poly noise displacement on base Icosahedron geometry.
 * 4. Zero-GC Memory Management: Matrix and color transformations reuse preallocated helper objects.
 */
export class AsteroidField extends THREE.Group {
  /**
   * @param {Object} options - Configuration options
   * @param {number} [options.maxCount=200] - Maximum instance capacity
   * @param {number} [options.detailLevel=1] - Icosahedron subdivision level (1 or 2)
   * @param {number} [options.baseRadius=1.0] - Base radius of individual asteroid mesh
   * @param {number} [options.distortionStrength=0.38] - Vertex displacement magnitude
   */
  constructor(options = {}) {
    super();

    this.name = 'AsteroidField';
    this.maxCount = options.maxCount || 200;
    this.detailLevel = options.detailLevel !== undefined ? options.detailLevel : 1;
    this.baseRadius = options.baseRadius || 1.0;
    this.distortionStrength = options.distortionStrength || 0.38;

    // Temporary reusable transformation helpers (Zero GC allocation in loops)
    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();
    this._matrix = new THREE.Matrix4();
    this._position = new THREE.Vector3();
    this._rotation = new THREE.Euler();
    this._scale = new THREE.Vector3();

    // Rocky mineral color palette
    this.colorPalette = [
      new THREE.Color(0x1e293b), // Dark Slate
      new THREE.Color(0x334155), // Basalt Gray
      new THREE.Color(0x475569), // Ferrite Ore
      new THREE.Color(0x1e1b4b), // Cobalt Dark
      new THREE.Color(0x0f172a), // Carbon Black
      new THREE.Color(0x27272a), // Zinc Stone
    ];

    this.initGeometry();
    this.initMaterial();
    this.initInstancedMesh();
  }

  /**
   * Generates procedurally deformed low-poly Icosahedron geometry.
   */
  initGeometry() {
    this.geometry = new THREE.IcosahedronGeometry(this.baseRadius, this.detailLevel);

    // Apply procedural vertex displacement for organic rocky morphology
    this.applyProceduralDistortion(this.geometry, 42);
  }

  /**
   * Applies deterministic 3D harmonic displacement to geometry vertices.
   */
  applyProceduralDistortion(geometry, seed = 1337) {
    const prng = createPRNG(seed);
    const positionAttr = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttr.count; i++) {
      vertex.fromBufferAttribute(positionAttr, i);

      // Spherical harmonic noise approximation
      const nx = vertex.x * 1.5;
      const ny = vertex.y * 1.5;
      const nz = vertex.z * 1.5;

      const noise =
        Math.sin(nx * 2.1 + prng() * 0.5) * 0.4 +
        Math.cos(ny * 2.7 + prng() * 0.5) * 0.35 +
        Math.sin(nz * 3.3 + prng() * 0.5) * 0.25;

      const displacement = 1.0 + noise * this.distortionStrength;
      vertex.multiplyScalar(displacement);

      positionAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
  }

  /**
   * Creates low-poly rocky material with flat shading.
   */
  initMaterial() {
    this.material = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.88,
      metalness: 0.22,
      flatShading: true,
    });
  }

  /**
   * Initializes the InstancedMesh with pre-allocated color & matrix buffers.
   */
  initInstancedMesh() {
    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.maxCount
    );

    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;

    // Initialize all instances with identity / hidden scale
    for (let i = 0; i < this.maxCount; i++) {
      this._dummy.position.set(0, -9999, 0);
      this._dummy.scale.set(0, 0, 0);
      this._dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this._dummy.matrix);
      this.instancedMesh.setColorAt(i, this.colorPalette[0]);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this.add(this.instancedMesh);
  }

  /**
   * Deterministic generation & spatial placement of asteroids for a given sector.
   * 
   * @param {Object} sectorData - Sector metadata (hazard_level, coordinates, multiplier)
   * @param {Object} areaBounds - Spatial boundary configuration
   * @param {number|string} [seed] - Optional explicit seed or derived from sector coordinates
   */
  generate(sectorData = {}, areaBounds = {}, seed = null) {
    const {
      coordinate_q = 0,
      coordinate_r = 0,
      hazard_level = 1,
      resource_yield_multiplier = 1.0,
    } = sectorData;

    // Derive deterministic seed from axial coordinates if not explicitly supplied
    const effectiveSeed =
      seed !== null && seed !== undefined
        ? seed
        : hashStringToSeed(`sector_${coordinate_q}_${coordinate_r}_${hazard_level}`);

    const prng = createPRNG(effectiveSeed);

    // Area Boundaries Configuration
    const {
      minRadius = 3.8, // Exclusion radius to prevent collision with core station
      maxRadius = 14.5, // Outer perimeter of asteroid belt
      heightVariance = 3.2,
      innerExclusion = true,
    } = areaBounds;

    // Scale asteroid density with hazard level and resource multiplier
    const count = Math.min(
      this.maxCount,
      Math.max(40, Math.floor(60 + hazard_level * 22 + resource_yield_multiplier * 15))
    );

    this.instancedMesh.count = count;

    for (let i = 0; i < count; i++) {
      // 1. Polar/Toroidal distribution around sector center
      const angle = prng() * Math.PI * 2;
      const radius = innerExclusion
        ? minRadius + Math.sqrt(prng()) * (maxRadius - minRadius)
        : prng() * maxRadius;

      const x = Math.cos(angle) * radius + (prng() - 0.5) * 1.2;
      const z = Math.sin(angle) * radius + (prng() - 0.5) * 1.2;
      const y = (prng() - 0.5) * heightVariance * (1.0 - (radius / maxRadius) * 0.4);

      this._dummy.position.set(x, y, z);

      // 2. Randomized orientation
      this._dummy.rotation.set(
        prng() * Math.PI * 2,
        prng() * Math.PI * 2,
        prng() * Math.PI * 2
      );

      // 3. Power-law scaling (many small asteroids, few massive monoliths)
      const scaleBase = Math.pow(prng(), 2.8);
      const uniformScale = 0.18 + scaleBase * 1.4;

      // Anisotropic elongation
      const stretchX = uniformScale * (0.75 + prng() * 0.5);
      const stretchY = uniformScale * (0.75 + prng() * 0.5);
      const stretchZ = uniformScale * (0.75 + prng() * 0.5);

      this._dummy.scale.set(stretchX, stretchY, stretchZ);
      this._dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this._dummy.matrix);

      // 4. Subtle mineral color tinting
      const paletteIndex = Math.floor(prng() * this.colorPalette.length);
      const baseColor = this.colorPalette[paletteIndex];
      
      // Slight luminance jitter
      const jitter = (prng() - 0.5) * 0.12;
      this._color.copy(baseColor).offsetHSL(0, 0, jitter);

      // Rare hazard glow tint for high-risk sectors
      if (hazard_level >= 4 && prng() > 0.85) {
        this._color.setHex(0xe11d48); // Crimson ore vein
      } else if (resource_yield_multiplier >= 2.0 && prng() > 0.88) {
        this._color.setHex(0x06b6d4); // Cyan silicate crystal
      }

      this.instancedMesh.setColorAt(i, this._color);
    }

    // Flag GPU buffers for upload
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    // Compute bounding sphere for optimal frustum culling
    this.instancedMesh.computeBoundingSphere();
  }

  /**
   * Optional frame-by-frame orbital rotation
   * @param {number} delta - Frame delta time in seconds
   * @param {number} [speed=0.04] - Rotation velocity
   */
  update(delta, speed = 0.04) {
    this.rotation.y += speed * delta;
  }

  /**
   * Strict Resource Disposal
   */
  dispose() {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.instancedMesh) {
      this.remove(this.instancedMesh);
      this.instancedMesh = null;
    }
    this.clear();
  }
}

export default AsteroidField;
