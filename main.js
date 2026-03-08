import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. Setup Scene, Camera, and Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Grab the info panel element from your HTML
const infoPanel = document.getElementById('info-panel'); 

// 2. Add Lighting
const ambientLight = new THREE.AmbientLight(0x333333); // Dim background star light
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 2, 300); // Light emanating from the Sun
scene.add(pointLight);

// Helper: Create a simple radial gradient texture for the glow
const canvas = document.createElement('canvas');
canvas.width = 128; 
canvas.height = 128;
const context = canvas.getContext('2d');
const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
context.fillStyle = gradient;
context.fillRect(0, 0, 128, 128);
const glowTexture = new THREE.CanvasTexture(canvas);

// --- GENERATE SUN TEXTURE LOCALLY ---
const sunCanvas = document.createElement('canvas');
sunCanvas.width = 512;
sunCanvas.height = 512;
const sunCtx = sunCanvas.getContext('2d');
const sunTexture = new THREE.CanvasTexture(sunCanvas);

// Store sun spots for animation
const sunSpots = [];
for (let i = 0; i < 100; i++) {
    sunSpots.push({
        x: Math.random() * 512,
        y: Math.random() * 512,
        r: Math.random() * 40 + 10,
        color: Math.random() > 0.5 ? '#ffaa00' : '#ffcc00',
        vx: (Math.random() - 0.5) * 0.5, // Random drift velocity
        vy: (Math.random() - 0.5) * 0.5
    });
}

function updateSunTexture() {
    sunCtx.fillStyle = '#ff8800';
    sunCtx.fillRect(0, 0, 512, 512);
    
    sunSpots.forEach(spot => {
        spot.x += spot.vx;
        spot.y += spot.vy;
        
        // Wrap around edges
        if (spot.x > 550) spot.x = -40;
        if (spot.x < -40) spot.x = 550;
        if (spot.y > 550) spot.y = -40;
        if (spot.y < -40) spot.y = 550;
        
        sunCtx.beginPath();
        sunCtx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
        sunCtx.fillStyle = spot.color;
        sunCtx.fill();
    });
    sunTexture.needsUpdate = true;
}

// --- GENERATE SUN RAYS TEXTURE LOCALLY ---
const sunRaysCanvas = document.createElement('canvas');
sunRaysCanvas.width = 512;
sunRaysCanvas.height = 512;
const sunRaysCtx = sunRaysCanvas.getContext('2d');
const sunRaysTexture = new THREE.CanvasTexture(sunRaysCanvas);

const sunRays = [];
for (let i = 0; i < 60; i++) {
    sunRays.push({
        angle: Math.random() * Math.PI * 2,
        length: 100 + Math.random() * 150, // Length from center
        speed: (Math.random() - 0.5) * 0.01, // Rotation speed
        opacity: Math.random() * 0.5
    });
}

function updateSunRays() {
    sunRaysCtx.clearRect(0, 0, 512, 512);
    sunRaysCtx.save();
    sunRaysCtx.translate(256, 256); // Move to center
    
    sunRays.forEach(ray => {
        ray.angle += ray.speed;
        ray.opacity += (Math.random() - 0.5) * 0.02;
        if (ray.opacity > 0.5) ray.opacity = 0.5;
        if (ray.opacity < 0.1) ray.opacity = 0.1;

        sunRaysCtx.beginPath();
        sunRaysCtx.moveTo(0, 0);
        sunRaysCtx.lineTo(Math.cos(ray.angle) * ray.length, Math.sin(ray.angle) * ray.length);
        sunRaysCtx.strokeStyle = `rgba(255, 220, 100, ${ray.opacity})`;
        sunRaysCtx.lineWidth = 3;
        sunRaysCtx.stroke();
    });
    
    sunRaysCtx.restore();
    sunRaysTexture.needsUpdate = true;
}

// --- GENERATE EARTH TEXTURE LOCALLY ---
const earthCanvas = document.createElement('canvas');
earthCanvas.width = 512;
earthCanvas.height = 512;
const earthCtx = earthCanvas.getContext('2d');
const earthTexture = new THREE.CanvasTexture(earthCanvas);

// Store Earth features
const earthContinents = [];
for (let i = 0; i < 20; i++) {
    earthContinents.push({
        x: Math.random() * 512,
        y: Math.random() * 512,
        r: Math.random() * 50 + 20
    });
}

const earthClouds = [];
for (let i = 0; i < 30; i++) {
    earthClouds.push({
        x: Math.random() * 512,
        y: Math.random() * 512,
        r: Math.random() * 60 + 10,
        vx: (Math.random() * 0.5) + 0.2 // Clouds move horizontally
    });
}

function updateEarthTexture() {
    // Ocean
    earthCtx.fillStyle = '#003366';
    earthCtx.fillRect(0, 0, 512, 512);

    // Continents (Static relative to texture)
    earthCtx.fillStyle = '#228b22';
    earthContinents.forEach(cont => {
        earthCtx.beginPath();
        earthCtx.arc(cont.x, cont.y, cont.r, 0, Math.PI * 2);
        earthCtx.fill();
    });

    // Clouds (Moving)
    earthCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    earthClouds.forEach(cloud => {
        cloud.x += cloud.vx;
        // Wrap around
        if (cloud.x > 560) cloud.x = -60;

        earthCtx.beginPath();
        earthCtx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
        earthCtx.fill();
    });
    earthTexture.needsUpdate = true;
}

// 3. Create the Sun
const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.name = "Sun";

// Add glow sprite to Sun
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffaa00,
    blending: THREE.AdditiveBlending
}));
sunGlow.scale.set(15, 15, 1); // Make it larger than the sun
sun.add(sunGlow);
scene.add(sun);

// Add animated rays sprite to Sun
const sunRaysSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunRaysTexture,
    color: 0xffaa00,
    blending: THREE.AdditiveBlending,
    depthWrite: false
}));
sunRaysSprite.scale.set(16, 16, 1); // Slightly larger than the glow
sun.add(sunRaysSprite);

// 4. Create the Earth
const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
const earthMaterial = new THREE.MeshStandardMaterial({ map: earthTexture });
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.name = "Earth";

// Optional: Add faint atmosphere glow to Earth
const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x54CBFF,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
}));
earthGlow.scale.set(3, 3, 1);
earth.add(earthGlow);
scene.add(earth);

// 5. Setup Camera Position and Mouse Controls
camera.position.z = 15;
camera.position.y = 5;
const controls = new OrbitControls(camera, renderer.domElement);

// 6. Setup Raycaster and Mouse Variables
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Track mouse movements
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// 7. Handle window resizing gracefully
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 8. Animation Loop
let time = 0;

function animate() {
    requestAnimationFrame(animate);

    // Animate textures
    updateSunTexture();
    updateSunRays();
    updateEarthTexture();

    // Simple circular orbit math
    time += 0.01; // Orbit speed
    const semiMajorAxis = 10;
    const semiMinorAxis = 7;
    
    // Calculate new position using Sine and Cosine
    earth.position.x = Math.cos(time) * semiMajorAxis;
    earth.position.z = Math.sin(time) * semiMinorAxis;
    
    // Rotate the Earth on its own axis
    earth.rotation.y += 0.02;

    // --- RAYCASTING LOGIC GOES HERE ---
    // Update the picking ray with the camera and mouse position every frame
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([sun, earth]);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        
        // Calculate real-time distance (assuming 8 units = 1 AU)
        const distance = sun.position.distanceTo(earth.position);
        const distAU = (distance / 8).toFixed(2);
        const distKM = Math.round((distance / 8) * 149597870).toLocaleString();
        
        // Calculate velocity (derivative of position)
        const vx = -Math.sin(time) * semiMajorAxis * 0.01;
        const vz = Math.cos(time) * semiMinorAxis * 0.01;
        const speed = Math.sqrt(vx*vx + vz*vz);
        const velocityKM = (speed * 350).toFixed(2); // Scale to approx Earth speed

        // Show the info panel with details
        if (infoPanel) {
            if (obj.name === "Sun") {
                infoPanel.innerHTML = `
                    <h2 class="gradient-text sun">The Sun</h2>
                    <p>The star at the center of the Solar System.</p>
                    <p><strong>Dist. from Earth:</strong> ${distAU} AU (${distKM} km)</p>
                    <p><strong>Eq. Radius:</strong> 696,340 km</p>
                    <p><strong>Mass:</strong> 1.989 × 10^30 kg</p>
                    <p><strong>Rotation Period:</strong> 25 days</p>
                `;
                infoPanel.classList.remove('hidden');
            } else if (obj.name === "Earth") {
                infoPanel.innerHTML = `
                    <h2 class="gradient-text earth">Earth</h2>
                    <p>The only astronomical object known to harbor life.</p>
                    <p><strong>Dist. from Sun:</strong> ${distAU} AU (${distKM} km)</p>
                    <p><strong>Orbital Velocity:</strong> ${velocityKM} km/s</p>
                    <p><strong>Eq. Radius:</strong> 6,371 km</p>
                    <p><strong>Mass:</strong> 5.972 × 10^24 kg</p>
                    <p><strong>Rotation Period:</strong> 1 day</p>
                    <p><strong>Orbital Period:</strong> 365.25 days</p>
                `;
                infoPanel.classList.remove('hidden');
            } else {
                infoPanel.classList.add('hidden');
            }
        }

        // Highlight Earth if it is the one being hovered
        if (obj === earth) earth.material.emissive.setHex(0x112244);
        else earth.material.emissive.setHex(0x000000);

    } else {
        // We are NOT hovering over anything
        if (infoPanel) infoPanel.classList.add('hidden');
        earth.material.emissive.setHex(0x000000); // Remove the glow
    }
    // ----------------------------------

    controls.update(); 
    renderer.render(scene, camera);
}

// Start the engine
animate();