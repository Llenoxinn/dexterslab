import * as THREE from "three";

/**
 * A Filipino wooden lab for the hero: narra plank floors, woven sawali walls, molave trims,
 * bamboo posts, capiz-shell lamps and a banig mat. Textures are painted on canvases at load.
 */

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat: [number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 8;
  return texture;
}

/** Seeded so the planks look the same on every visit. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Narra floorboards: warm red-brown planks with grain, seams and staggered end joints. */
export function narraTexture(repeat: [number, number] = [3, 4]) {
  return canvasTexture(
    512,
    (ctx, size) => {
      const rand = rng(7);
      const tones = ["#7b3f22", "#8a4a2a", "#6c3519", "#94532f", "#743b1f"];
      const plank = size / 6;
      for (let row = 0; row < 6; row++) {
        const y = row * plank;
        const joint = rand() * size;
        for (const [x0, x1] of [
          [0, joint],
          [joint, size],
        ]) {
          ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
          ctx.fillRect(x0, y, x1 - x0, plank);
          // Grain: long, slightly wavy darker strands.
          for (let g = 0; g < 9; g++) {
            const gy = y + 4 + rand() * (plank - 8);
            ctx.strokeStyle = `rgba(40, 16, 6, ${0.12 + rand() * 0.14})`;
            ctx.lineWidth = 0.8 + rand() * 1.2;
            ctx.beginPath();
            ctx.moveTo(x0, gy);
            for (let x = x0; x <= x1; x += 24) ctx.lineTo(x, gy + Math.sin(x * 0.02 + g) * 1.6);
            ctx.stroke();
          }
          ctx.fillStyle = "rgba(30, 12, 4, 0.55)";
          ctx.fillRect(x0, y, 2, plank); // end joint
        }
        ctx.fillStyle = "rgba(25, 10, 3, 0.7)";
        ctx.fillRect(0, y, size, 2); // seam
        ctx.fillStyle = "rgba(255, 210, 160, 0.08)";
        ctx.fillRect(0, y + 2, size, 2); // worn edge highlight
      }
    },
    repeat,
  );
}

/** Sawali: split-bamboo strips woven over-and-under in a herringbone basket weave. */
export function sawaliTexture(repeat: [number, number] = [6, 5]) {
  return canvasTexture(
    256,
    (ctx, size) => {
      const cell = size / 8;
      const rand = rng(11);
      ctx.fillStyle = "#8a6a3e";
      ctx.fillRect(0, 0, size, size);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const horizontal = (Math.floor(c / 2) + Math.floor(r / 2)) % 2 === 0;
          const x = c * cell;
          const y = r * cell;
          const tone = 196 + Math.floor(rand() * 30);
          ctx.fillStyle = `rgb(${tone}, ${tone - 38}, ${tone - 98})`;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
          // Each cell is 3 strips; shade the strip edges so the weave reads in 3D.
          for (let k = 1; k < 3; k++) {
            ctx.fillStyle = "rgba(70, 45, 15, 0.35)";
            if (horizontal) ctx.fillRect(x, y + (k * cell) / 3, cell, 1.5);
            else ctx.fillRect(x + (k * cell) / 3, y, 1.5, cell);
          }
          const shade = ctx.createLinearGradient(x, y, horizontal ? x + cell : x, horizontal ? y : y + cell);
          shade.addColorStop(0, "rgba(60, 35, 10, 0.3)");
          shade.addColorStop(0.5, "rgba(255, 240, 200, 0.06)");
          shade.addColorStop(1, "rgba(60, 35, 10, 0.3)");
          ctx.fillStyle = shade;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }
    },
    repeat,
  );
}

/** Banig: a woven pandan mat with bright bands and diamonds. */
function banigTexture() {
  return canvasTexture(
    512,
    (ctx, size) => {
      ctx.fillStyle = "#d9b77a";
      ctx.fillRect(0, 0, size, size);
      // Fine diagonal weave.
      ctx.strokeStyle = "rgba(120, 80, 30, 0.22)";
      ctx.lineWidth = 2;
      for (let i = -size; i < size * 2; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, size);
        ctx.lineTo(i + size, 0);
        ctx.stroke();
      }
      const bands = ["#c2283b", "#1f7a4a", "#e8b321", "#5b2d8c", "#c2283b"];
      bands.forEach((color, i) => {
        const y = 40 + i * 104;
        ctx.fillStyle = color;
        ctx.fillRect(0, y, size, 14);
        // Diamonds along each band.
        for (let x = 24; x < size; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, y - 14);
          ctx.lineTo(x + 14, y + 7);
          ctx.lineTo(x, y + 28);
          ctx.lineTo(x - 14, y + 7);
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.strokeStyle = "#7a1d2a";
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, size - 10, size - 10);
    },
    [1, 1],
  );
}

/** A hand-painted wooden sign. */
export function signTexture(fontFamily: string) {
  const texture = canvasTexture(
    512,
    (ctx, size) => {
      const h = size / 2;
      ctx.fillStyle = "#5a2f17";
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = `rgba(30, 12, 4, ${0.08 + ((y * 37) % 10) / 100})`;
        ctx.fillRect(0, y, size, 1);
      }
      ctx.textAlign = "center";
      ctx.fillStyle = "#f6e7c4";
      ctx.font = `700 64px ${fontFamily}`;
      ctx.fillText("Maligayang", size / 2, 112);
      ctx.fillStyle = "#ffcc4d";
      ctx.font = `700 84px ${fontFamily}`;
      ctx.fillText("Pasko!", size / 2, 200);
    },
    [1, 1],
  );
  texture.repeat.set(1, 0.5);
  texture.offset.set(0, 0.5);
  return texture;
}

export function createFilipinoLab(root: THREE.Group, wood: THREE.Material) {
  const set = new THREE.Group();
  set.name = "filipino-lab";
  root.add(set);
  const textures: THREE.Texture[] = [];

  const narraPanel = narraTexture([5, 1]);
  narraPanel.rotation = Math.PI / 2;
  textures.push(narraPanel);
  const wainscotMat = new THREE.MeshStandardMaterial({ color: 0xc89a7a, map: narraPanel, roughness: 0.6 });

  // Wood wainscoting along the lower walls, capped by a molave rail.
  const panel = (w: number, x: number, z: number, rotY: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.35, 0.06), wainscotMat);
    mesh.position.set(x, 0.675, z);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    set.add(mesh);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.12), wood);
    rail.position.set(x, 1.38, z);
    rail.rotation.y = rotY;
    set.add(rail);
  };
  panel(19.7, 2.85, -3.97, 0);
  // The room is a cutaway: only the left wall exists, and it stops at the open front edge.
  panel(13.5, -6.97, 2.45, Math.PI / 2);

  // Bamboo posts at the back corners, with nodes every half metre.
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xc9a65a, roughness: 0.45 });
  const nodeMat = new THREE.MeshStandardMaterial({ color: 0x8c6a2e, roughness: 0.5 });
  for (const x of [-6.75, 12.75]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 7, 18), bambooMat);
    pole.position.set(x, 3.5, -3.78);
    pole.castShadow = true;
    set.add(pole);
    // Nodes are one instanced draw call per pole.
    const nodeYs = Array.from({ length: 12 }, (_, i) => 0.5 + i * 0.55);
    const nodes = new THREE.InstancedMesh(new THREE.TorusGeometry(0.135, 0.018, 6, 20), nodeMat, nodeYs.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    nodeYs.forEach((y, i) => nodes.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, -3.78), q, new THREE.Vector3(1, 1, 1))));
    set.add(nodes);
  }

  // Banig mat on the floor in front of the desk.
  const banig = banigTexture();
  textures.push(banig);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.3), new THREE.MeshStandardMaterial({ map: banig, roughness: 0.85 }));
  mat.rotation.x = -Math.PI / 2;
  mat.rotation.z = 0.06;
  mat.position.set(0.9, 0.012, 0.7);
  mat.receiveShadow = true;
  set.add(mat);

  // No ceiling in the cutaway, so the hanging capiz lamps are gone; the sun lights the room.
  const lamps: THREE.Group[] = [];
  const lampLights: THREE.PointLight[] = [];

  return {
    set,
    textures,
    tick(time: number) {
      const t = Number.isFinite(time) ? time : 0;
      lamps.forEach((lamp, i) => {
        lamp.rotation.y = Math.sin(t * 0.25 + i) * 0.12;
        lamp.rotation.z = Math.sin(t * 0.6 + i * 2) * 0.012;
      });
      // A gentle candle-like flicker keeps the room feeling lit, not rendered.
      lampLights.forEach((light, i) => {
        light.intensity = 9 + Math.sin(t * 3.1 + i) * 0.35 + Math.sin(t * 7.7 + i * 3) * 0.2;
      });
    },
  };
}
