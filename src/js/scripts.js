import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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

const renderer = new THREE.WebGLRenderer({antialias : true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Step 1: Create an AxesHelper instance
// The parameter 100 defines the size of the axes (adjust this value based on your needs)
const axesHelper = new THREE.AxesHelper(100);
// Step 2: Add the AxesHelper to your scene
scene.add(axesHelper);

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const orbit = new OrbitControls(camera, renderer.domElement);

camera.position.set(-90, 140, 140);
orbit.update();

const clock = new THREE.Clock();

const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
    starsTexture,
    starsTexture,
    starsTexture,
    starsTexture,
    starsTexture,
    starsTexture
]);


const textureLoader = new THREE.TextureLoader();

//UI
const planetInfoDiv = document.getElementById('planetDetails');

// Create a raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Function to update mouse position
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

// Add mouse move event listener
window.addEventListener('mousemove', onMouseMove, false);


// Get the button element
const spawnButton = document.getElementById('spawnButton');

// Attach the event listener
spawnButton.addEventListener('click', spawnObject);

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



const planets = []

class Planet {
    constructor(name, size, texturePath, position, velocity, mass, emissive = false) {
        const velocityscale = 4e7;
        this.name = name;
        this.size = size;
        this.position = position;
        this.velocity = velocity.multiplyScalar(velocityscale);
        this.mass = mass;
        

        const geometry = new THREE.SphereGeometry(size, 64, 64);
        const texture = new THREE.TextureLoader().load(texturePath);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const material = new THREE.MeshPhongMaterial({
            map: texture,
            shininess: 5
        });

        if (emissive) {
            material.emissive = new THREE.Color(0xffff00);
            material.emissiveIntensity = 10;
        }

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        // Trace setup
        this.tracePoints = [];
        const traceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
        this.trace = new THREE.Line(new THREE.BufferGeometry(), traceMaterial);
        scene.add(this.trace);
        

        planets.push(this);
    }
    attract(planet, dt) {
        const G = 6.67e-11;
        const distance = Math.max(this.mesh.position.distanceTo(planet.mesh.position), 1);
        const dir = new THREE.Vector3().copy(planet.mesh.position).sub(this.mesh.position).normalize();
        const forceMagnitude = G * this.mass * planet.mass / (distance * distance);
        const force = dir.multiplyScalar(forceMagnitude);
        const acceleration = force.multiplyScalar(1 / this.mass);
        this.velocity.addScaledVector(acceleration, dt);
    }

    update(dt) {
        
        this.mesh.position.addScaledVector(this.velocity, dt);

        // Update trace
        this.tracePoints.push(this.mesh.position.clone());
        if (this.tracePoints.length > 1000) { // Limit the number of points to prevent performance issues
            this.tracePoints.shift();
        }
        this.trace.geometry.setFromPoints(this.tracePoints);
    }

}

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
    const object = new Planet(
        'new planet',
        planetSize,
        textureLoader.load(sunTexture), // Use textureLoader to load the texture
        obj_position,
        obj_velocity,
        planetMass
    );
    
    // Add the new planet to the planets array
    planets.push(object);
    
    console.log('New planet created:', object);
}

// Create planets with enhanced textures
const sun = new Planet('Sun', 20, sunTexture, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), 1.989e30, true);
const mercury = new Planet('Mercury', 3.8, mercuryTexture, new THREE.Vector3(39, 0, 0), new THREE.Vector3(0, 0, 47.87), 3.285e23);
const venus = new Planet('Venus', 5.8, venusTexture, new THREE.Vector3(72, 0, 0), new THREE.Vector3(0, 0, 35.02), 4.867e24);
const earth = new Planet('Earth', 6, earthTexture, new THREE.Vector3(100, 0, 0), new THREE.Vector3(0, 0, 29.78), 5.972e24);
const mars = new Planet('Mars', 4, marsTexture, new THREE.Vector3(152, 0, 0), new THREE.Vector3(0, 0, 24.07), 6.39e23);
const jupiter = new Planet('Jupiter', 12, jupiterTexture, new THREE.Vector3(249, 0, 0), new THREE.Vector3(0, 0, 13.07), 1.898e27);
const saturn = new Planet('Saturn', 10, saturnTexture, new THREE.Vector3(302, 0, 0), new THREE.Vector3(0, 0, 9.69), 5.683e26);

// Add Saturn's rings
const ringGeometry = new THREE.RingGeometry(15, 20, 64);
const ringMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load(saturnRingTexture),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
});
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
ring.rotation.x = Math.PI / 2;
saturn.mesh.add(ring);

// Improve lighting
const ambientLight = new THREE.AmbientLight(0x333333,5);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xFFFFFF, 25, 300);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Set up post-processing for bloom effect
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 0.6;
bloomPass.radius = 0;
composer.addPass(bloomPass);


function animate() {
    //Self-rotation
    sun.mesh.rotateY(0.04);
    mercury.mesh.rotateY(0.04);
    saturn.mesh.rotateY(0.038);
    uranus.mesh.rotateY(0.03);
    neptune.mesh.rotateY(0.032);
    pluto.mesh.rotateY(0.008);
    mars.mesh.rotateY(0.04);

    //Around-sun-rotation
    //mercury.obj.rotateY(0.004);
    //venus.obj.rotateY(0.015);
    //earth.obj.rotateY(0.01);
    //mars.obj.rotateY(0.008);
    //jupiter.obj.rotateY(0.002);
    //saturn.obj.rotateY(0.0009);
    //uranus.obj.rotateY(0.0004);
    //neptune.obj.rotateY(0.0001);
    //pluto.obj.rotateY(0.00007);

    // Update the planets' positions
    const speedFactorInput = document.getElementById('speedFactor');
    const globalFactor = 0.000000001;
    const dt = clock.getDelta() * speedFactorInput.value * globalFactor;

    // Update the planets' positions
    // New loop to handle attraction and update
    planets.forEach(body => {
        planets.forEach(otherBody => {
            if (body !== otherBody) {
                body.attract(otherBody, dt);
            }
        });
        body.update(dt);
    });
    
    updatePlanetInfo();
    renderer.render(scene, camera);

}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});