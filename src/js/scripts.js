// Import Three.js and required modules
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Import texture images for celestial bodies and background
import starsTexture from '../img/stars.jpg';
import sunTexture from '../img/sun.jpg';
import mercuryTexture from '../img/mercury.jpg';
import venusTexture from '../img/venus.jpg';
import earthTexture from '../img/earth.jpg';
import marsTexture from '../img/mars.jpg';
import jupiterTexture from '../img/jupiter.jpg';
import saturnTexture from '../img/saturn.jpg';
import saturnRingTexture from '../img/saturn ring.png';
import uranusTexture from '../img/uranus.jpg';
import uranusRingTexture from '../img/uranus ring.png';
import neptuneTexture from '../img/neptune.jpg';
import plutoTexture from '../img/pluto.jpg';

// Create a WebGL renderer with antialiasing
const renderer = new THREE.WebGLRenderer({antialias : true});
// Set the pixel ratio to match the device's display
renderer.setPixelRatio(window.devicePixelRatio);
// Set the renderer size to match the window size
renderer.setSize(window.innerWidth, window.innerHeight);
// Set up tone mapping for better color representation
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

// Add the renderer's canvas to the document body
document.body.appendChild(renderer.domElement);

// Create a new Three.js scene
const scene = new THREE.Scene();
// Add an axes helper to the scene for debugging
const axesHelper = new THREE.AxesHelper(100);
scene.add(axesHelper);

// Create a perspective camera
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
);

// Set up orbit controls for user interaction
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(-90, 750, 750);
orbit.update();

// Create a clock for tracking time in animations
const clock = new THREE.Clock();

// Load a cube texture for the background (starry sky)
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
    starsTexture,
    starsTexture,
    starsTexture,
    starsTexture,
    starsTexture,
    starsTexture
]);

// Get reference to the planet info display element
const planetInfoDiv = document.getElementById('planetDetails');

// Create a raycaster for mouse picking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Function to update mouse position
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

// Add mouse move event listener
window.addEventListener('mousemove', onMouseMove, false);

// Get reference to the spawn button
const spawnButton = document.getElementById('spawnButton');

// Attach click event listener to spawn button
spawnButton.addEventListener('click', spawnObject);

// Function to update planet information display
function updatePlanetInfo() {
    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        // Find the first intersected object that is a planet
        const intersectedPlanet = planets.find(planet => planet.mesh === intersects[0].object);
        if (intersectedPlanet) {
            // Update the planet info display
            planetInfoDiv.innerHTML = `
                <p><strong>Name:</strong> ${intersectedPlanet.name}</p>
                <p><strong>Size:</strong> ${intersectedPlanet.size}</p>
                <p><strong>Mass:</strong> ${intersectedPlanet.mass.toExponential(2)} kg</p>
                <p><strong>Position:</strong> 
                    (${intersectedPlanet.mesh.position.x.toFixed(2)}, 
                     ${intersectedPlanet.mesh.position.y.toFixed(2)}, 
                     ${intersectedPlanet.mesh.position.z.toFixed(2)})
                </p>
                <p><strong>Velocity:</strong> 
                    (${intersectedPlanet.velocity.x.toFixed(2)}, 
                     ${intersectedPlanet.velocity.y.toFixed(2)}, 
                     ${intersectedPlanet.velocity.z.toFixed(2)})
                </p>
            `;
        } else {
            // If no planet is intersected, clear the info
            planetInfoDiv.innerHTML = '<p>Hover over a planet to see its information.</p>';
        }
    } else {
        // If nothing is intersected, clear the info
        planetInfoDiv.innerHTML = '<p>Hover over a planet to see its information.</p>';
    }
}

// Array to store all planet objects
const planets = []

// Planet class definition
class Planet {
    constructor(name, size, texturePath, position, velocity, mass, emissive = false, atmosphericDensity = 0) {
        this.name = name;
        this.size = size;
        this.position = position;
        this.velocity = velocity.multiplyScalar(4e7);
        this.mass = mass;
        this.atmosphericDensity = atmosphericDensity;
        this.forceArrows = new THREE.Group();
        scene.add(this.forceArrows);
        this.forces = {};

        // Create sphere geometry for the planet
        const geometry = new THREE.SphereGeometry(size, 64, 64);
        const texture = new THREE.TextureLoader().load(texturePath);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        // Create material for the planet
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            shininess: 5
        });

        // Add emissive properties if specified (for sun-like objects)
        if (emissive) {
            material.emissive = new THREE.Color(0xffff00);
            material.emissiveIntensity = 5;
        }

        // Add a light source if the planet is the sun
        if (this.name.toLowerCase() === "sun") {
            const sunLight = new THREE.PointLight(0xffffff, 7.5, 0);
            sunLight.position.set(position.x, position.y, position.z);
            scene.add(sunLight);
        }

        // Create mesh and add to scene
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        // Add atmosphere if specified
        if (atmosphericDensity > 0) {
            this.addAtmosphere(size * 1.05, new THREE.Color(0x93cfef));
        }

        // Set up trace for planet's orbit
        this.tracePoints = [];
        const traceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
        this.trace = new THREE.Line(new THREE.BufferGeometry(), traceMaterial);
        scene.add(this.trace);

        // Add the planet to the planets array
        planets.push(this);
    }

    // Method to add atmosphere to the planet
    addAtmosphere(size, color) {
        const atmosphereGeometry = new THREE.SphereGeometry(size * 1.2, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: { value: color },
                atmosphericDensity: { value: this.atmosphericDensity }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.mesh.add(atmosphere);
    }

    // Method to calculate gravitational attraction between planets
    attract(planet, dt) {
        const G = 6.67e-11;
        const distance = Math.max(this.mesh.position.distanceTo(planet.mesh.position), 1);
        const dir = new THREE.Vector3().copy(planet.mesh.position).sub(this.mesh.position).normalize();
        const forceMagnitude = G * this.mass * planet.mass / (distance * distance);
        const force = dir.multiplyScalar(forceMagnitude);
        const acceleration = force.multiplyScalar(1 / this.mass);
        this.velocity.addScaledVector(acceleration, dt);

        // Store the force for visualization
        this.forces[planet.name] = force;
    }

    // Method to update planet's position and trace
    update(dt) {
        // Update position
        this.mesh.position.addScaledVector(this.velocity, dt);
        // Update trace
        this.tracePoints.push(this.mesh.position.clone());
        if (this.tracePoints.length > 2500) {
            this.tracePoints.shift();
        }
        this.trace.geometry.setFromPoints(this.tracePoints);
        this.updateForceVisualization();
    }

    // Method to update force visualization
    updateForceVisualization() {
        // Remove all previous force arrows
        while(this.forceArrows.children.length > 0) {
            this.forceArrows.remove(this.forceArrows.children[0]);
        }

        // Create new force arrows
        for (let [planetName, force] of Object.entries(this.forces)) {
            const arrowHelper = this.createForceArrow(force, planetName);
            this.forceArrows.add(arrowHelper);
        }

        // Update the position of the force arrows group
        this.forceArrows.position.copy(this.mesh.position);
    }

    // Method to create a force arrow
    createForceArrow(force) {
        const origin = new THREE.Vector3(0, 0, 0);
        const forceMagnitude = force.length();
        const forceDir = force.normalize();
        
        // Scale the arrow length
        const arrowLength = forceMagnitude * 1e-15;
        
        // Create a white color for the arrow
        const color = new THREE.Color(0xffffff)
        const arrowHelper = new THREE.ArrowHelper(forceDir, origin, arrowLength, color);
        return arrowHelper;
    }
}

/// Vertex Shader
const vertexShader = `
// The varying keyword is used to pass data from the vertex shader to the fragment shader
varying vec3 vNormal;

void main() {
    // Normalize the normal vector and transform it from model space to view space
    // The normalMatrix is the upper-left 3x3 of modelViewMatrix, used for normal transformation
    vNormal = normalize(normalMatrix * normal);

    // Transform the vertex position from model space to clip space
    // This is the standard vertex transformation in OpenGL
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment Shader
const fragmentShader = `
// Uniform variables are set from the JavaScript code and are constant for all fragments
uniform vec3 glowColor;
uniform float atmosphericDensity;

// This receives the interpolated normal vector from the vertex shader
varying vec3 vNormal;

void main() {
    // Calculate the intensity of the glow effect
    // This creates a rim lighting effect by taking the dot product of the view vector (0,0,1) and the normal
    // The result is inverted (0.4 - ...) so that the edge of the sphere glows more than the center
    float intensity = pow(0.4 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);

    // Modify the intensity based on the atmospheric density
    intensity *= atmosphericDensity;

    // Set the final color
    // The alpha channel is set to 0.5, but the intensity controls the overall visibility
    gl_FragColor = vec4(glowColor, 0.5) * intensity;
}
`;

// Function to spawn a new object based on user input
function spawnObject(event) {
    // Get the form inputs
    const massInput = document.getElementById('planetMass');
    const sizeInput = document.getElementById('planetSize');
    const velocityInput = document.getElementById('planetVelocity');

    // Get the input values
    const planetMass = parseFloat(massInput.value);
    const planetSize = parseFloat(sizeInput.value);
    const planetVelocity = parseFloat(velocityInput.value);

    // Set position of the object at camera position
    const obj_position = camera.position.clone();
    // Set the object velocity to the camera direction
    const obj_velocity_dir = new THREE.Vector3();
    camera.getWorldDirection(obj_velocity_dir);
    // Multiply the velocity by the speed
    const obj_velocity = obj_velocity_dir.multiplyScalar(planetVelocity);
    
    // Create a new planet
    const greyMaterial = new THREE.MeshPhongMaterial({ color: 0x888888, emissive: 0x444444 });
    const object = new Planet(
        'new planet',
        planetSize,
        greyMaterial, // Use textureLoader to load the texture
        obj_position,
        obj_velocity,
        planetMass,
        true,
    );
    
    // Add the new planet to the planets array
    planets.push(object);
    console.log('New planet created:', object);
}

// Create sun and planets
const sun = new Planet('Sun', 20, sunTexture, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), 1.989e30, true, 0, 1.2);
const mercury = new Planet('Mercury', 3.8, mercuryTexture, new THREE.Vector3(39, 0, 0), new THREE.Vector3(0, 0, 47.87), 3.285e23, false, 0, 1.0);
const venus = new Planet('Venus', 5.8, venusTexture, new THREE.Vector3(72, 0, 0), new THREE.Vector3(0, 0, 35.02), 4.867e24, false, 1.5, 1.1);
const earth = new Planet('Earth', 6, earthTexture, new THREE.Vector3(100, 0, 0), new THREE.Vector3(0, 0, 29.78), 5.972e24, false, 1.0, 1.1);
const mars = new Planet('Mars', 4, marsTexture, new THREE.Vector3(152, 0, 0), new THREE.Vector3(0, 0, 24.07), 6.39e23, false, 0.3, 1.05);
const jupiter = new Planet('Jupiter', 12, jupiterTexture, new THREE.Vector3(249, 0, 0), new THREE.Vector3(0, 0, 20.07), 1.898e27, false, 0.8, 1.15);
const saturn = new Planet('Saturn', 10, saturnTexture, new THREE.Vector3(333, 0, 0), new THREE.Vector3(0, 0, 18.69), 5.683e26, false, 0.5, 1.1);

const uranus = new Planet('Uranus', 8, uranusTexture, new THREE.Vector3(375, 0, 0), new THREE.Vector3(0, 0, 17.81), 8.681e25, false, 0.4, 1.07);
const neptune = new Planet('Neptune', 7.8, neptuneTexture, new THREE.Vector3(500, 0, 0), new THREE.Vector3(0, 0, 16.43), 1.024e26, false, 0.4, 1.07);
const pluto = new Planet('Pluto', 2, plutoTexture, new THREE.Vector3(600, 0, 0), new THREE.Vector3(0, 0, 14.67), 1.309e22, false, 0, 1.0);

// Add Saturn's rings
const saturnRingGeometry = new THREE.RingGeometry(15, 20, 64);
const saturnRingMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load(saturnRingTexture),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
});
const saturnRing = new THREE.Mesh(saturnRingGeometry, saturnRingMaterial);
saturnRing.rotation.x = Math.PI / 2;
saturn.mesh.add(saturnRing);

// Add Uranus' rings
const uranusRingGeometry = new THREE.RingGeometry(12, 14, 64);
const uranusRingMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load(uranusRingTexture),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
});
const uranusRing = new THREE.Mesh(uranusRingGeometry, uranusRingMaterial);
uranusRing.rotation.x = Math.PI / 2;
uranus.mesh.add(uranusRing);

// Add Neptune's rings (faint and narrow)
const neptuneRingGeometry = new THREE.RingGeometry(11.5, 12, 64);
const neptuneRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x4ca6ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
});
const neptuneRing = new THREE.Mesh(neptuneRingGeometry, neptuneRingMaterial);
neptuneRing.rotation.x = Math.PI / 2;
neptune.mesh.add(neptuneRing);

// Add ambient light to the scene
const ambientLight = new THREE.AmbientLight(0x333333, 5);
scene.add(ambientLight);

// Set up post-processing effects
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Add bloom effect
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
bloomPass.threshold = 0;
bloomPass.strength = 0.4;
bloomPass.radius = 0.1;
composer.addPass(bloomPass);

// Main animation loop
function animate() {
    // Self-rotation of planets
    sun.mesh.rotateY(0.04);
    mercury.mesh.rotateY(0.04);
    saturn.mesh.rotateY(0.038);
    uranus.mesh.rotateY(0.03);
    neptune.mesh.rotateY(0.032);
    pluto.mesh.rotateY(0.008);
    mars.mesh.rotateY(0.04);
    venus.mesh.rotateY(0.04);
    earth.mesh.rotateY(0.04);
    jupiter.mesh.rotateY(0.039);

    // Update the planets' positions
    const speedFactorInput = document.getElementById('speedFactor');
    const globalFactor = 0.000000001;
    const dt = clock.getDelta() * speedFactorInput.value * globalFactor;

    // Calculate gravitational interactions and update positions
    planets.forEach(body => {
        planets.forEach(otherBody => {
            if (body !== otherBody) {
                body.attract(otherBody, dt);
            }
        });
        body.update(dt);
    });
    
    // Update planet information display
    updatePlanetInfo();

    // Render the scene
    renderer.render(scene, camera);
    composer.render();
}

// Start the animation loop
renderer.setAnimationLoop(animate);

// Handle window resizing
window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
