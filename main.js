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

// Mobilon (ugyanaz a töréspont, mint a CSS-ben: 700px) egy kicsit
// távolabbról indul a kamera, hogy a doboz ne töltse ki túlságosan
// a keskeny képernyőt – a Reset View gomb is mindig ide tér vissza,
// mert az OrbitControls a betöltéskor elmentett állapotot állítja
// vissza.
const isMobile = window.innerWidth <= 700;

const CAMERA_POS_DESKTOP = new THREE.Vector3(4.102, -0.008, -0.186);
const CAMERA_POS_MOBILE = new THREE.Vector3(5.48, 0.006, -0.172);

camera.position.copy(isMobile ? CAMERA_POS_MOBILE : CAMERA_POS_DESKTOP);

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

// Sok mobil böngésző (főleg iOS Safari) nem játssza le a videót, ha az
// elem nincs ténylegesen a dokumentum DOM-jában – vizuálisan elrejtjük,
// de nem display:none-nal, mert azt egyes böngészők leállásnak veszik.
video.classList.add("hidden-video");
document.body.appendChild(video);

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

// Néhány mobil böngésző (pl. bizonyos beágyazott/in-app böngészők) még
// muted + playsinline mellett is blokkolja az automatikus indítást.
// Ha ez történik, mutatunk egy gombot, amire koppintva – közvetlen
// felhasználói érintésből – biztosan elindul a videó.
const tapPrompt = document.getElementById("tapPrompt");

function showTapPromptIfStillPaused() {

    if (video.paused) {
        tapPrompt.classList.remove("hidden");
    }

}

video.addEventListener("playing", () => {
    tapPrompt.classList.add("hidden");
});

video.addEventListener("pause", () => {
    // Ha a videó bármikor leáll (pl. az iOS rendszer szünetelteti),
    // mutassuk meg újra a gombot, hogy egy koppintással újraindítható legyen.
    showTapPromptIfStillPaused();
});

tapPrompt.addEventListener("click", async () => {

    try {
        await video.play();
    } catch (e) {
        // marad kint a felirat, próbálkozhat újra
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

    setTimeout(showTapPromptIfStillPaused, 800);

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

    try {

        isInside = false;
        insideBtn.textContent = "Stand Inside";
        insideBtn.classList.remove("active");

        controls.minDistance = 0;
        controls.maxDistance = Infinity;
        controls.enableZoom = true;
        controls.enablePan = true;

        controls.reset();

    } catch (e) {

        console.error("Reset hiba:", e);

    }

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

function handleResize() {

    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);

}

window.addEventListener("resize", handleResize);

// A mobil Safari címsorának összecsukódása/kinyílása néha nem vált ki
// megbízható "resize" eseményt, emiatt a canvas és a kamera aspektusa
// szétcsúszhat egymástól (ez okozza az elcsúszott/oldalra tolt képet).
// A visualViewport API és egy késleltetett újraellenőrzés ezt kivédi.
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleResize);
}

window.addEventListener("orientationchange", () => {
    setTimeout(handleResize, 300);
});

setTimeout(handleResize, 300);
setTimeout(handleResize, 1000);

// ======= LOOP =======

function animate() {

    requestAnimationFrame(animate);

    try {

        if (video.readyState >= video.HAVE_CURRENT_DATA) {

            if (video.paused) {

                playVideo();

            }

            texture.needsUpdate = true;

        }

        controls.update();

        renderer.render(scene, camera);

    } catch (e) {

        // Egy esetleges hiba (pl. egy adott mobil böngésző furcsasága)
        // ne fagyassza le véglegesen a képet – a következő frame-nél
        // újrapróbáljuk, és közben kiírjuk a hibát a konzolra.
        console.error("Render hiba:", e);

    }

}

animate();