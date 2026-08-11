import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const renderer = new THREE.WebGLRenderer({
    canvas: bg,
    antialias: true,
    alpha: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

// ======= KEZDŐ NÉZET =======
camera.position.set(4.102, -0.008, -0.186);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = false;
controls.target.set(-0.116, -0.055, -0.234);
controls.update();
controls.saveState();

// ======= FÉNYEK =======
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(5, 5, 5);
scene.add(light);

// ======= VIDEO =======

const video = document.createElement("video");

video.src = "video.mp4";
video.loop = true;
video.muted = true;
video.autoplay = true;
video.playsInline = true;
video.preload = "auto";
video.crossOrigin = "anonymous";

video.setAttribute("playsinline", "");
video.setAttribute("webkit-playsinline", "");
video.setAttribute("muted", "");
video.setAttribute("autoplay", "");
video.setAttribute("loop", "");

video.load();

const texture = new THREE.VideoTexture(video);
texture.flipY = false;
texture.colorSpace = THREE.SRGBColorSpace;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.generateMipmaps = false;

async function playVideo() {

    try {

        if (video.readyState < 2) return;

        if (video.paused || video.ended) {

            await video.play();

        }

    } catch (e) {

        // Safari gyakran elsőre elutasítja
    }

}

video.addEventListener("loadedmetadata", playVideo);
video.addEventListener("loadeddata", playVideo);
video.addEventListener("canplay", playVideo);
video.addEventListener("canplaythrough", playVideo);

[
    "touchstart",
    "touchend",
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "click"
].forEach(evt => {

    window.addEventListener(evt, playVideo);

});

document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {
        playVideo();
    }

});

// ======= GLB =======

new GLTFLoader().load("KANVAS_BLAND_HTML.glb", gltf => {

    gltf.scene.traverse(obj => {

        if (!obj.isMesh) return;

        const materials = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];

        materials.forEach(mat => {

            if (mat.name === "Video") {

                mat.map = texture;
                mat.needsUpdate = true;

            }

        });

    });

    scene.add(gltf.scene);

    loading.classList.add("hidden");

    playVideo();

});

// ======= HELP =======

const infoBtn = document.getElementById("infoBtn");
const controlsPanel = document.getElementById("controls");

infoBtn.onclick = () => {

    controlsPanel.classList.toggle("hidden");

};

// ======= RESET =======

resetBtn.onclick = () => {

    controls.reset();

};

// ======= RESIZE =======

window.addEventListener("resize", () => {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

});

// ======= LOOP =======

function animate() {

    requestAnimationFrame(animate);

    if (video.readyState >= video.HAVE_CURRENT_DATA) {

        if (video.paused) {

            playVideo();

        }

        texture.needsUpdate = true;

    }

    controls.update();

    renderer.render(scene, camera);

}

animate();