import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStore } from '../store/useStore';
import { AsteroidField } from './AsteroidField';
import { VesselRenderer } from './VesselRenderer';
import { audioEngine } from '../utils/audioEngine';

/**
 * SceneManager - Core Three.js WebGL Orchestrator for the Tactical View
 * 
 * Performance & Architecture Directives:
 * 1. Isometric Tactical Overview: High-angle perspective camera capturing spatial fleet formations.
 * 2. OrbitControls Integration: Smooth damping, zoom limits (5-45), and pitch bounds.
 * 3. Interactive Raycasting & Target Selection: Clicking asteroids selects them for mining and activates laser FX.
 * 4. Procedural Entity Integration: Renders AsteroidField and procedural low-poly VesselRenderer.
 * 5. Strict Resource Management: Comprehensive cleanup() method disposing all geometries, 
 *    materials, textures, listeners, controls, and renderer contexts.
 */
export class SceneManager {
  /**
   * @param {HTMLCanvasElement|HTMLElement} canvasElement - Target Canvas or DOM container
   */
  constructor(canvasElement) {
    if (!canvasElement) {
      throw new Error('[SceneManager] A valid canvas or container DOM element is required.');
    }

    this.domElement = canvasElement;
    this.animationFrameId = null;
    this.isDestroyed = false;
    this.fleetsData = [];
    this.selectedTargetPos = null;

    // Internal Clock
    this.clock = new THREE.Clock();

    // Raycaster & Pointer
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // Bind methods to instance
    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);

    // Initialize WebGL Pipeline
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initLighting();
    this.initEntities();
    this.initLaserBeamFX();
    this.initInteraction();
    this.initResizeHandling();
    this.bindStateSubscription();

    // Start requestAnimationFrame Simulation Loop
    this.animate();
  }

  /**
   * 1. Initialize WebGL Renderer
   */
  initRenderer() {
    const isCanvas = this.domElement instanceof HTMLCanvasElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas: isCanvas ? this.domElement : undefined,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    const width = this.domElement.clientWidth || 800;
    const height = this.domElement.clientHeight || 500;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    if (!isCanvas) {
      this.domElement.appendChild(this.renderer.domElement);
    }
  }

  /**
   * 2. Initialize Scene Graph
   */
  initScene() {
    this.scene = new THREE.Scene();
  }

  /**
   * 3. Configure Isometric Tactical Overview Camera
   */
  initCamera() {
    const width = this.domElement.clientWidth || 800;
    const height = this.domElement.clientHeight || 500;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(12.0, 15.0, 12.0);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * 4. OrbitControls with Smooth Damping and Bounds
   */
  initControls() {
    const targetElement = this.domElement instanceof HTMLCanvasElement ? this.domElement : this.renderer.domElement;
    this.controls = new OrbitControls(this.camera, targetElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 45;
    this.controls.maxPolarAngle = Math.PI / 2.05; // Prevent dipping below ground grid
  }

  /**
   * 5. Dark Industrial Space Lighting & Environment
   */
  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0x0f172a, 2.2);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xf8fafc, 3.2);
    this.directionalLight.position.set(14, 20, 10);
    this.directionalLight.castShadow = true;
    this.scene.add(this.directionalLight);

    this.centerGlowLight = new THREE.PointLight(0x06b6d4, 3.0, 22);
    this.centerGlowLight.position.set(0, 0, 0);
    this.scene.add(this.centerGlowLight);
  }

  /**
   * 6. Procedural Entity Integration
   */
  initEntities() {
    this.asteroidField = new AsteroidField({
      maxCount: 200,
      detailLevel: 1,
      baseRadius: 0.95,
      distortionStrength: 0.38,
    });
    this.scene.add(this.asteroidField);

    this.asteroidField.generate({
      coordinate_q: 0,
      coordinate_r: 0,
      hazard_level: 2,
      resource_yield_multiplier: 1.6,
    });

    this.vesselRenderer = new VesselRenderer(this.scene);

    // AI Hostile Incursions WebGL Layer (Day 6)
    this.hostilesGroup = new THREE.Group();
    this.scene.add(this.hostilesGroup);

    this.hostileGeometry = new THREE.ConeGeometry(0.55, 1.4, 4);
    this.hostileMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0x881337,
      emissiveIntensity: 0.8,
    });
    this.hostileLaserMaterial = new THREE.LineBasicMaterial({
      color: 0xf43f5e,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.activeHostileMeshes = new Map();
  }

  /**
   * 7. Interactive Procedural Laser FX
   */
  initLaserBeamFX() {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
    this.laserGeometry = new THREE.BufferGeometry().setFromPoints(points);
    this.laserMaterial = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.laserLine = new THREE.Line(this.laserGeometry, this.laserMaterial);
    this.laserLine.visible = false;
    this.scene.add(this.laserLine);
  }

  /**
   * 8. Interaction & Raycaster Object Selection
   */
  initInteraction() {
    const targetElement = this.domElement instanceof HTMLCanvasElement ? this.domElement : this.renderer.domElement;
    targetElement.addEventListener('pointerdown', this.onPointerDown);
  }

  onPointerDown(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      this.selectedTargetPos = hit.point.clone();
      this.laserLine.visible = true;

      audioEngine.playLaserFire();

      // Pulse center glow light
      if (this.centerGlowLight) {
        this.centerGlowLight.intensity = 5.0;
        setTimeout(() => {
          if (this.centerGlowLight) this.centerGlowLight.intensity = 3.0;
        }, 300);
      }
    }
  }

  /**
   * Updates WebGL representations of AI Hostile Incursions.
   * Disposes of geometry/buffers when incursions are repelled.
   */
  updateHostileEntities(incursions = []) {
    if (!this.scene || this.isDestroyed) return;

    const incursionIds = new Set(incursions.map((i) => i.id));

    // Remove expired hostile meshes and dispose buffers
    for (const [id, hostileData] of this.activeHostileMeshes.entries()) {
      if (!incursionIds.has(id)) {
        this.hostilesGroup.remove(hostileData.group);
        if (hostileData.laserLine) {
          this.scene.remove(hostileData.laserLine);
        }
        if (hostileData.laserGeom) {
          hostileData.laserGeom.dispose();
        }
        this.activeHostileMeshes.delete(id);
      }
    }

    // Add new hostile incursions
    for (let i = 0; i < incursions.length; i++) {
      const inc = incursions[i];
      if (!this.activeHostileMeshes.has(inc.id)) {
        const group = new THREE.Group();

        // Low-poly Hostile Vessel Mesh
        const mesh = new THREE.Mesh(this.hostileGeometry, this.hostileMaterial);
        mesh.rotation.x = Math.PI / 2;
        group.add(mesh);

        // Hostile Red Laser Line targeting user position
        const laserPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
        const laserGeom = new THREE.BufferGeometry().setFromPoints(laserPoints);
        const laserLine = new THREE.Line(laserGeom, this.hostileLaserMaterial);
        this.scene.add(laserLine);

        const angle = (i * Math.PI * 2) / (incursions.length || 1);
        const radius = 6.5;
        const speed = 0.8 + Math.random() * 0.4;

        this.hostilesGroup.add(group);
        this.activeHostileMeshes.set(inc.id, {
          group,
          mesh,
          laserLine,
          laserGeom,
          angle,
          radius,
          speed,
        });
      }
    }
  }

  /**
   * 9. Transient State Binding via Zustand Store Subscription
   */
  bindStateSubscription() {
    this.unsubscribeStore = useStore.subscribe((state) => {
      if (this.isDestroyed) return;
      if (state.fleets) {
        this.fleetsData = state.fleets;
      }
      if (state.incursions) {
        this.updateHostileEntities(state.incursions);
      }
    });

    const initialState = useStore.getState();
    if (initialState.fleets) {
      this.fleetsData = initialState.fleets;
    }
    if (initialState.incursions) {
      this.updateHostileEntities(initialState.incursions);
    }
  }

  /**
   * 10. Responsive Viewport Synchronization
   */
  initResizeHandling() {
    this.resizeObserver = new ResizeObserver((entries) => {
      if (this.isDestroyed || !entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        this.onResize(width, height);
      }
    });

    this.resizeObserver.observe(this.domElement);
    window.addEventListener('resize', this.onResize);
  }

  onResize(customWidth, customHeight) {
    const width = typeof customWidth === 'number' ? customWidth : this.domElement.clientWidth;
    const height = typeof customHeight === 'number' ? customHeight : this.domElement.clientHeight;

    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  /**
   * 11. High-Frequency Simulation Animation Loop
   */
  animate() {
    if (this.isDestroyed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // Update OrbitControls damping
    if (this.controls) {
      this.controls.update();
    }

    // Micro-rotation of the asteroid field
    if (this.asteroidField) {
      this.asteroidField.update(delta, 0.022);
    }

    // Update vessel vectors
    if (this.vesselRenderer) {
      this.vesselRenderer.update(this.fleetsData, delta);
    }

    // Update dynamic interactive laser line
    if (this.laserLine && this.laserLine.visible && this.selectedTargetPos) {
      const positions = this.laserGeometry.attributes.position.array;
      // Connect origin (or primary vessel position) to targeted asteroid
      positions[0] = 0;
      positions[1] = 0.5;
      positions[2] = 0;
      positions[3] = this.selectedTargetPos.x;
      positions[4] = this.selectedTargetPos.y;
      positions[5] = this.selectedTargetPos.z;
      this.laserGeometry.attributes.position.needsUpdate = true;
    }

    // Animate AI hostile patrol orbits and hostile red lasers
    for (const [id, hostileData] of this.activeHostileMeshes.entries()) {
      hostileData.angle += hostileData.speed * delta;
      const hx = Math.cos(hostileData.angle) * hostileData.radius;
      const hz = Math.sin(hostileData.angle) * hostileData.radius;
      const hy = Math.sin(hostileData.angle * 2) * 0.8 + 0.5;

      hostileData.group.position.set(hx, hy, hz);
      hostileData.group.lookAt(0, 0, 0);

      // Update hostile red laser line connecting hostile ship to user vessel
      if (hostileData.laserLine && hostileData.laserGeom) {
        const positions = hostileData.laserGeom.attributes.position.array;
        positions[0] = hx;
        positions[1] = hy;
        positions[2] = hz;
        positions[3] = 0; // Target player vessel origin
        positions[4] = 0.3;
        positions[5] = 0;
        hostileData.laserGeom.attributes.position.needsUpdate = true;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 12. Strict Resource Disposal & Teardown
   */
  cleanup() {
    this.isDestroyed = true;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const targetElement = this.domElement instanceof HTMLCanvasElement ? this.domElement : this.renderer?.domElement;
    if (targetElement) {
      targetElement.removeEventListener('pointerdown', this.onPointerDown);
    }

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.onResize);

    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    if (this.laserGeometry) {
      this.laserGeometry.dispose();
    }
    if (this.laserMaterial) {
      this.laserMaterial.dispose();
    }

    // Teardown AI Hostile WebGL entities & laser lines
    for (const [id, hostileData] of this.activeHostileMeshes.entries()) {
      if (hostileData.laserGeom) hostileData.laserGeom.dispose();
      if (hostileData.laserLine) {
        this.scene?.remove(hostileData.laserLine);
      }
    }
    this.activeHostileMeshes.clear();

    if (this.hostileGeometry) this.hostileGeometry.dispose();
    if (this.hostileMaterial) this.hostileMaterial.dispose();
    if (this.hostileLaserMaterial) this.hostileLaserMaterial.dispose();
    if (this.hostilesGroup) {
      this.scene?.remove(this.hostilesGroup);
      this.hostilesGroup = null;
    }

    if (this.asteroidField) {
      this.asteroidField.dispose();
      this.asteroidField = null;
    }
    if (this.vesselRenderer) {
      this.vesselRenderer.dispose();
      this.vesselRenderer = null;
    }

    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((mat) => {
            if (!mat) return;
            mat.map?.dispose();
            mat.lightMap?.dispose();
            mat.bumpMap?.dispose();
            mat.normalMap?.dispose();
            mat.specularMap?.dispose();
            mat.envMap?.dispose();
            mat.dispose();
          });
        }
      });
      this.scene.clear();
      this.scene = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode && !(this.domElement instanceof HTMLCanvasElement)) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
  }

  destroy() {
    this.cleanup();
  }
}

export default SceneManager;
