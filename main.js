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

const DEFAULT_TARGET = new THREE.Vector3(-0.116, -0.055, -0.234);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = false;
controls.target.copy(DEFAULT_TARGET);
controls.update();
controls.saveState();

// A modell geometriai közepe (a doboz -1..1 tartományban van minden
// tengelyen) – ide áll be a kamera a "Stand Inside" módban.
const ROOM_CENTER = new THREE.Vector3(0, 0, 0);

// Mobilon a canvas-en történő húzás ne a lapot görgesse/pöckölje,
// hanem mindig a kamerát forgassa.
renderer.domElement.style.touchAction = "none";

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

const loadingLabel = document.querySelector("#loading span");

new GLTFLoader().load("KANVAS_BLAND_HTML.glb", gltf => {

    gltf.scene.traverse(obj => {

        if (!obj.isMesh) return;

        if (!Array.isArray(obj.material) && obj.material.name === "Video") {

            // A "Video" anyagot unlit (fénytől független) anyagra cseréljük,
            // hogy a videó saját fényereje jelenjen meg, ne sötétítsék el
            // a jelenet fényei (pl. a plafon és a sarkok).
            obj.material = new THREE.MeshBasicMaterial({
                map: texture,
                side: obj.material.side
            });

        } else if (Array.isArray(obj.material)) {

            obj.material = obj.material.map(mat => {

                if (mat.name === "Video") {

                    return new THREE.MeshBasicMaterial({
                        map: texture,
                        side: mat.side
                    });

                }

                return mat;

            });

        }

    });

    scene.add(gltf.scene);

    loading.classList.add("hidden");

    playVideo();

}, undefined, error => {

    // Ha a modell nem töltődik be, ne ragadjon örökre a töltőképernyőn –
    // írjuk ki a hibát konzolra és a képernyőre is.
    console.error("A 3D modell betöltése sikertelen:", error);

    if (loadingLabel) {
        loadingLabel.textContent = "Hiba a betöltéskor – nézd meg a konzolt (F12)";
    }

});

// ======= HELP =======

const infoBtn = document.getElementById("infoBtn");
const controlsPanel = document.getElementById("controls");

infoBtn.onclick = () => {

    controlsPanel.classList.toggle("hidden");

};

// ======= RESET =======

resetBtn.onclick = () => {

    isInside = false;
    insideBtn.textContent = "Stand Inside";
    insideBtn.classList.remove("active");

    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    controls.enableZoom = true;
    controls.enablePan = true;

    controls.reset();

};

// ======= BELÜLRŐL NÉZET =======

const insideBtn = document.getElementById("insideBtn");

// Az OrbitControls mindig egy fix "target" pont körül forgatja a kamerát
// egy adott sugáron (radius). Ha a sugarat nagyon kicsire állítjuk, és a
// kamerát a szoba közepére tesszük, a forgatás gyakorlatilag helyben
// körülnézést eredményez – mintha ott állnánk a szoba közepén.
let isInside = false;
const INSIDE_LOOK_RADIUS = 0.0015;

insideBtn.onclick = () => {

    isInside = !isInside;

    if (isInside) {

        // Belépés: kamera a szoba közepére. A célpontot a –X irányba
        // toljuk el egy hajszálnyival, mert a modell geometriája az
        // +X oldalon van nyitva (onnan lát be kívülről a néző) – tehát
        // "befelé nézni" a –X irány.
        camera.position.copy(ROOM_CENTER);
        controls.target.set(
            ROOM_CENTER.x - INSIDE_LOOK_RADIUS,
            ROOM_CENTER.y,
            ROOM_CENTER.z
        );

        controls.minDistance = INSIDE_LOOK_RADIUS;
        controls.maxDistance = INSIDE_LOOK_RADIUS;
        controls.enableZoom = false;
        controls.enablePan = false;

        controls.update();

        insideBtn.textContent = "Exit View";
        insideBtn.classList.add("active");

    } else {

        // Kilépés: vissza az eredeti kültéri/rálátó nézetre.
        controls.minDistance = 0;
        controls.maxDistance = Infinity;
        controls.enableZoom = true;
        controls.enablePan = true;

        controls.reset();

        insideBtn.textContent = "Stand Inside";
        insideBtn.classList.remove("active");

    }

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