import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { box, mat, tex } from "../utils/TextureGenerator";

// Rings allow a broad shoulder, fitted waist and rounded jaw without external meshes.
const shell = new T.CylinderGeometry(0.5, 0.43, 1, 10);
const globe = new T.SphereGeometry(0.5, 12, 8);
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
  flatShading: true,
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
  form(g, 0, 1.22, 0, 0.68, 0.61, 0.42, jacket);
  form(g, 0, 0.955, 0, 0.58, 0.12, 0.38, rib);
  form(g, 0, 1.53, 0, 0.43, 0.13, 0.35, rib);
  form(g, 0, 1.59, 0, 0.19, 0.17, 0.19, skin);
  form(g, 0, 1.77, 0, 0.35, 0.39, 0.32, skin, true);
  form(g, 0, 1.91, 0.016, 0.37, 0.22, 0.34, hair, true);
  form(g, 0, 1.82, 0.115, 0.29, 0.18, 0.12, hair, true);
  form(g, 0, 1.75, -0.155, 0.077, 0.09, 0.07, skin, true);
  for (let sign of [-1, 1]) {
    form(g, sign * 0.161, 1.76, 0.005, 0.057, 0.085, 0.06, skin, true);
    box(g, sign * 0.071, 1.8, -0.143, 0.048, 0.023, 0.018, hair);
  }
  box(g, 0, 1.23, -0.19, 0.017, 0.49, 0.018, accent);
  if (!variant) {
    box(g, 0, 1.28, 0.201, 0.29, 0.28, 0.014, backPatch());
    for (let s of [-1, 1])
      form(g, s * 0.246, 1.42, 0, 0.21, 0.16, 0.35, accent, true);
  } else if (cop || variant % 3 === 0) {
    form(g, 0, 1.955, 0, 0.39, 0.12, 0.36, jacket);
    box(g, 0, 1.917, -0.14, 0.3, 0.029, 0.19, jacket);
    box(g, -0.13, 1.36, -0.17, 0.067, 0.086, 0.017, accent);
  } else if (variant % 3 === 1) {
    form(g, 0, 1.97, 0.07, 0.27, 0.23, 0.25, hair, true);
  } else {
    form(g, 0, 1.53, 0.133, 0.44, 0.27, 0.23, jacket, true);
  }
  const limbs: T.Group[] = [];
  for (let k = 0; k < 4; k++) {
    let arm = k > 1,
      s = k % 2 ? 1 : -1,
      j = new T.Group();
    g.add(j);
    j.position.set(s * (arm ? 0.326 : 0.145), arm ? 1.46 : 0.93, 0);
    if (arm) {
      form(j, 0, -0.135, 0, 0.234, 0.37, 0.266, jacket, true);
      form(j, 0, -0.347, -0.022, 0.184, 0.25, 0.213, jacket);
      form(j, 0, -0.47, -0.022, 0.162, 0.08, 0.184, rib);
      form(j, 0, -0.535, -0.034, 0.137, 0.17, 0.159, skin, true);
      j.rotation.z = s * 0.12;
    } else {
      form(j, 0, -0.22, 0, 0.29, 0.47, 0.32, denim);
      form(j, 0, -0.61, -0.006, 0.231, 0.39, 0.254, denim);
      form(j, 0, -0.825, -0.049, 0.24, 0.183, 0.364, rib, true);
      form(j, 0, -0.899, -0.056, 0.247, 0.058, 0.374, sole);
    }
    limbs.push(j);
  }
  for (const joint of [g, ...limbs]) batchJoint(joint);
  return { g, limbs };
}
