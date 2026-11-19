import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { box, mat, tex } from "../utils/TextureGenerator";

// Rings allow a broad shoulder, fitted waist and rounded jaw without external meshes.
const shell = new T.CylinderGeometry(0.5, 0.43, 1, 10);
const globe = new T.SphereGeometry(0.5, 16, 12);
// Shared lathed profiles give the jacket a shoulder line and the face a chin,
// cheekbones and forehead instead of scaling a sphere for every body part.
function profile(points: number[][]) {
  return new T.LatheGeometry(
    points.map(([y, r]) => new T.Vector2(r, y)),
    20,
  );
}
const torso = profile([
  [0.925, 0.205],
  [0.98, 0.265],
  [1.08, 0.266],
  [1.24, 0.299],
  [1.39, 0.334],
  [1.46, 0.31],
  [1.5, 0.22],
  [1.53, 0.13],
]);
const skull = profile([
  [1.605, 0.048],
  [1.636, 0.102],
  [1.69, 0.142],
  [1.76, 0.166],
  [1.81, 0.17],
  [1.89, 0.157],
  [1.945, 0.111],
  [1.974, 0.033],
]);
function shaped(
  g: T.Group,
  geometry: T.BufferGeometry,
  m: T.Material,
  width: number,
  depth: number,
) {
  const o = new T.Mesh(geometry, m);
  o.scale.set(width, 1, depth);
  g.add(o);
}
function form(
  p: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  m: T.Material,
  round = false,
) {
  const o = new T.Mesh(round ? globe : shell, m);
  o.position.set(x, y, z);
  o.scale.set(w, h, d);
  o.castShadow = true;
  p.add(o);
  return o;
}
let badge: T.MeshBasicMaterial | undefined;
function backPatch() {
  return (badge ??= new T.MeshBasicMaterial({
    map: tex(128, 128, (c) => {
      c.fillStyle = "#233944";
      c.fillRect(0, 0, 128, 128);
      c.strokeStyle = "#e1c192";
      c.lineWidth = 4;
      c.strokeRect(5, 5, 118, 118);
      c.fillStyle = "#fbd79a";
      c.textAlign = "center";
      c.font = "bold 19px sans-serif";
      c.fillText("NIGHTFALL", 64, 31);
      for (let j = 0; j < 4; j++) {
        c.fillStyle = ["#ffcc88", "#ffaf87", "#fe8a99", "#d9689b"][j];
        c.fillRect(32 - j * 2, 48 + 9 * j, 64 + 4 * j, 6);
      }
      c.fillStyle = "#efe5bc";
      c.font = "bold 14px sans-serif";
      c.fillText("MOTOR CLUB", 64, 106);
    }),
  }));
}
// One draw per animated joint, rather than a separate draw for each seam and facial feature.
const fabric = new T.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.82,
  flatShading: false,
});
function batchJoint(joint: T.Group) {
  const pieces: T.BufferGeometry[] = [];
  for (const piece of [...joint.children]) {
    if (
      !(piece instanceof T.Mesh) ||
      !(piece.material instanceof T.MeshStandardMaterial)
    )
      continue;
    piece.updateMatrix();
    const geo = piece.geometry.clone().applyMatrix4(piece.matrix);
    const rgb = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < rgb.length; i += 3)
      piece.material.color.toArray(rgb, i);
    geo.setAttribute("color", new T.BufferAttribute(rgb, 3));
    pieces.push(geo);
    joint.remove(piece);
  }
  if (pieces.length) {
    let mesh = new T.Mesh(mergeGeometries(pieces), fabric);
    mesh.castShadow = mesh.receiveShadow = true;
    joint.add(mesh);
    pieces.forEach((g) => g.dispose());
  }
}
export function person(coat: string, variant = 0, cop = false) {
  let g = new T.Group(),
    skin = mat(["#bc8167", "#8b5947", "#d2a183", "#a26e59"][variant % 4]),
    hair = mat(["#302429", "#47342b", "#292931"][variant % 3]),
    jacket = mat(coat),
    denim = mat(variant % 2 ? "#414951" : "#2a3548"),
    rib = mat("#242734"),
    sole = mat("#c5b7a7"),
    accent = mat(cop ? "#e4bd74" : "#ead4b7");
  const build = variant ? 0.94 + 0.035 * (variant % 5) : 1.03;
  shaped(g, torso, jacket, build, 0.68);
  const seam = mat(jacket.color.clone().multiplyScalar(0.64)),
    lip = mat(skin.color.clone().multiplyScalar(0.61));
  for (let s of [-1, 1]) {
    // Piped shoulder yoke, welt pockets and raised collar points.
    box(g, s * 0.128, 1.415, 0.19, 0.242, 0.017, 0.014, seam).rotation.z =
      s * 0.13;
    box(g, s * 0.175, 1.1, -0.145, 0.14, 0.023, 0.017, rib).rotation.z =
      s * 0.32;
    form(
      g,
      s * 0.095,
      1.47,
      -0.144,
      0.13,
      0.115,
      0.054,
      jacket,
      true,
    ).rotation.z = -s * 0.37;
  }
  form(g, 0, 0.955, 0, 0.58, 0.12, 0.38, rib);
  form(g, 0, 1.53, 0, 0.43, 0.13, 0.35, rib);
  form(g, 0, 1.59, 0, 0.19, 0.17, 0.19, skin);
  shaped(g, skull, skin, 0.97 + 0.018 * (variant % 4), 0.92);
  form(g, 0, 1.687, -0.119, 0.083, 0.014, 0.022, lip, true);
  form(g, 0, 1.744, -0.151, 0.055, 0.092, 0.061, skin, true);
  form(g, 0, 1.91, 0.016, 0.37, 0.22, 0.34, hair, true);
  form(g, 0, 1.833, 0.103, 0.3, 0.204, 0.14, hair, true);
  const highlight = mat(hair.color.clone().lerp(new T.Color("#8c715f"), 0.17));
  for (let k = -3; k <= 3; k++) {
    const strand = form(
      g,
      k * 0.039,
      1.959 - 0.004 * k * k,
      0.005,
      0.074,
      0.09,
      0.26,
      k % 3 ? hair : highlight,
      true,
    );
    strand.rotation.z = -0.17;
    strand.rotation.x = -0.16 + (variant % 3) * 0.13;
  }
  form(g, 0, 1.75, -0.155, 0.077, 0.09, 0.07, skin, true);
  for (let sign of [-1, 1]) {
    form(g, sign * 0.161, 1.76, 0.005, 0.057, 0.085, 0.06, skin, true);
    form(g, sign * 0.068, 1.79, -0.141, 0.052, 0.019, 0.019, sole, true);
    form(g, sign * 0.068, 1.791, -0.15, 0.02, 0.017, 0.013, hair, true);
    form(
      g,
      sign * 0.07,
      1.815,
      -0.144,
      0.063,
      0.015,
      0.016,
      hair,
      true,
    ).rotation.z = sign * 0.12;
    form(g, sign * 0.144, 1.835, -0.034, 0.039, 0.106, 0.077, hair, true);
  }
  box(g, 0, 1.23, -0.19, 0.017, 0.49, 0.018, accent);
  if (!variant) {
    box(g, 0, 1.28, 0.201, 0.29, 0.28, 0.014, backPatch());
    for (let s of [-1, 1]) {
      box(g, s * 0.153, 1.22, 0.176, 0.018, 0.36, 0.014, seam).rotation.z =
        -s * 0.11;
    }
  } else if (cop || variant % 3 === 0) {
    form(g, 0, 1.955, 0, 0.39, 0.12, 0.36, jacket);
    box(g, 0, 1.917, -0.14, 0.3, 0.029, 0.19, jacket);
    box(g, -0.13, 1.36, -0.17, 0.067, 0.086, 0.017, accent);
  } else if (variant % 3 === 1) {
    form(g, 0, 1.97, 0.07, 0.27, 0.23, 0.25, hair, true);
  } else {
    form(g, 0, 1.53, 0.133, 0.44, 0.27, 0.23, jacket, true);
  }
  if (cop) {
    box(g, 0.17, 1.35, -0.176, 0.095, 0.145, 0.052, rib);
    box(g, 0.196, 1.46, -0.166, 0.012, 0.094, 0.012, rib);
    for (const side of [-1, 1])
      box(g, side * 0.22, 0.969, -0.094, 0.097, 0.113, 0.095, rib);
  } else if (variant && variant % 3 === 2) {
    box(g, 0, 1.23, 0.223, 0.075, 0.61, 0.026, rib).rotation.z = -0.59;
    form(g, 0.21, 1.01, 0.137, 0.23, 0.25, 0.16, denim, true);
  } else if (variant && variant % 3 === 1) {
    for (let side of [-1, 1])
      form(g, side * 0.093, 1.866, 0.12, 0.17, 0.2, 0.149, hair, true);
  }
  // Garment details are batched with the torso, not drawn as separate actors.
  if (!variant || cop) {
    for (let side of [-1, 1]) {
      box(g, side * 0.148, 1.34, -0.174, 0.125, 0.063, 0.02, jacket);
      box(g, side * 0.148, 1.37, -0.189, 0.13, 0.024, 0.009, seam);
      form(g, side * 0.148, 1.364, -0.196, 0.015, 0.015, 0.008, accent, true);
    }
  }
  if (variant % 4 === 2) {
    for (let side of [-1, 1]) {
      form(g, side * 0.071, 1.795, -0.153, 0.123, 0.058, 0.023, rib, true);
      box(g, side * 0.138, 1.8, -0.079, 0.015, 0.016, 0.137, rib);
    }
    box(g, 0, 1.798, -0.157, 0.052, 0.012, 0.013, accent);
  }
  if (!variant || variant % 4 === 3) {
    for (let j = 0; j < 7; j++)
      form(
        g,
        (j - 3) * 0.028,
        1.662 + Math.abs(j - 3) * 0.009,
        -0.119,
        0.034,
        0.036,
        0.014,
        hair,
        true,
      );
  }
  const hinges: T.Group[] = [];
  const limbs: T.Group[] = [];
  for (let k = 0; k < 4; k++) {
    let arm = k > 1,
      s = k % 2 ? 1 : -1,
      j = new T.Group();
    g.add(j);
    j.position.set(s * (arm ? 0.326 : 0.145), arm ? 1.46 : 0.93, 0);
    if (arm) {
      if (!variant || cop) {
        form(j, 0, -0.203, 0, 0.211, 0.032, 0.247, accent);
        form(j, 0, -0.242, 0, 0.196, 0.017, 0.23, accent);
        box(j, s * 0.109, -0.133, 0.002, 0.014, 0.079, 0.09, seam);
      }
      form(j, 0, -0.135, 0, 0.234, 0.37, 0.266, jacket, true);
      form(j, 0, -0.347, -0.022, 0.184, 0.25, 0.213, jacket);
      form(j, 0, -0.47, -0.022, 0.162, 0.08, 0.184, rib);
      form(j, 0, -0.535, -0.034, 0.137, 0.17, 0.159, skin, true);
      form(j, s * 0.075, -0.54, -0.064, 0.045, 0.094, 0.049, skin, true);
      for (let k = 0; k < 2; k++)
        form(
          j,
          0,
          -0.306 - k * 0.085,
          -0.018,
          0.181,
          0.025,
          0.209,
          seam,
          true,
        ).rotation.x = 0.13;
      j.rotation.z = s * 0.12;
    } else {
      form(j, 0, -0.22, 0, 0.29, 0.47, 0.32, denim);
      form(j, 0, -0.61, -0.006, 0.231, 0.39, 0.254, denim);
      form(j, 0, -0.825, -0.049, 0.24, 0.183, 0.364, rib, true);
      box(j, s * 0.104, -0.25, 0.063, 0.014, 0.36, 0.021, rib);
      form(j, 0, -0.42, -0.064, 0.193, 0.114, 0.196, denim, true);
      for (let n = 0; n < 3; n++)
        box(
          j,
          0,
          -0.759 - n * 0.01,
          -0.09 - n * 0.028,
          0.107,
          0.013,
          0.019,
          sole,
        ).rotation.z = n % 2 ? 0.08 : -0.08;
      form(j, 0, -0.899, -0.056, 0.247, 0.058, 0.374, sole);
    }
    const hinge = new T.Group();
    hinge.position.y = arm ? -0.275 : -0.437;
    for (const mesh of [...j.children])
      if (mesh.position.y < hinge.position.y) {
        j.remove(mesh);
        mesh.position.y -= hinge.position.y;
        hinge.add(mesh);
      }
    j.add(hinge);
    hinges.push(hinge);
    limbs.push(j);
  }
  for (const joint of [g, ...limbs, ...hinges]) batchJoint(joint);
  const spine = new T.Group();
  spine.position.y = 0.92;
  for (const child of [...g.children]) {
    if (child === limbs[0] || child === limbs[1]) continue;
    g.remove(child);
    child.position.y -= 0.92;
    spine.add(child);
  }
  g.add(spine);
  return { g, limbs, hinges, spine };
}

/** Blend poses, rather than swapping clips when a character changes speed. */
export function gait(
  model: ReturnType<typeof person>,
  phase: number,
  speed: number,
  dt: number,
  injury = 0,
  running = false,
) {
  let blend = 1 - Math.exp(-12 * dt),
    stride = Math.min(1, speed / 1.3),
    run = running ? 1 : 0;
  for (let i = 0; i < 4; i++) {
    let arm = i > 1,
      wave = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)),
      damaged = i === 0 || i === 3;
    let swing =
      wave * (0.48 + run * 0.32) * stride * (damaged ? 1 - injury * 0.12 : 1);
    let bend = arm
      ? 0.15 + run * 0.8 + Math.max(0, wave) * 0.28 * stride
      : -(0.045 + Math.max(0, -wave) * (0.62 + run * 0.38) * stride);
    if (arm && damaged) bend += injury * 0.14;
    model.limbs[i].rotation.x += (swing - model.limbs[i].rotation.x) * blend;
    model.hinges[i].rotation.x += (bend - model.hinges[i].rotation.x) * blend;
  }
  model.spine.rotation.y +=
    (Math.cos(phase) * stride * (0.06 + 0.055 * run) - model.spine.rotation.y) *
    blend;
  model.spine.position.y =
    0.92 + stride * (0.013 + run * 0.022) * Math.cos(phase * 2);
  model.g.rotation.x +=
    (-run * 0.09 * stride - injury * 0.08 - model.g.rotation.x) * blend;
  model.g.rotation.z +=
    (Math.cos(phase) * stride * 0.025 + injury * 0.025 - model.g.rotation.z) *
    blend;
}
