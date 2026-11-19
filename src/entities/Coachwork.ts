import * as T from "three";
import { tex } from "../utils/TextureGenerator";
type Section = readonly [
  z: number,
  halfWidth: number,
  base: number,
  top: number,
  topWidth: number,
];
// Join trapezoidal stations longitudinally: silhouette, belt line and hood share one shell.
export function shell(
  parent: T.Group,
  stations: Section[],
  material: T.Material,
) {
  const pos: number[] = [],
    uv: number[] = [];
  const ring = ([z, w, b, t, r]: Section) => [
    [-w, b, z],
    [w, b, z],
    [r, t, z],
    [-r, t, z],
  ];
  const face = (a: number[], b: number[], c: number[], d: number[]) => {
    pos.push(...a, ...b, ...d, ...b, ...c, ...d);
    uv.push(0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1);
  };
  let rings = stations.map(ring);
  for (let k = 1; k < rings.length; k++) {
    let a = rings[k - 1],
      b = rings[k];
    for (let j = 0; j < 4; j++) {
      let n = (j + 1) % 4;
      face(a[j], a[n], b[n], b[j]);
    }
  }
  let a = rings[0],
    b = rings[rings.length - 1];
  face(a[3], a[2], a[1], a[0]);
  face(b[0], b[1], b[2], b[3]);
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const o = new T.Mesh(geo, material);
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}
let windowMat: T.MeshStandardMaterial, rim: T.MeshStandardMaterial;
export function glazing() {
  return (windowMat ??= new T.MeshStandardMaterial({
    map: tex(256, 128, (c) => {
      let gr = c.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, "#504b72");
      gr.addColorStop(0.5, "#758694");
      gr.addColorStop(0.55, "#463e59");
      gr.addColorStop(1, "#222b41");
      c.fillStyle = gr;
      c.fillRect(0, 0, 256, 128);
      c.fillStyle = "#d4cfdf22";
      c.beginPath();
      c.moveTo(22, 0);
      c.lineTo(65, 0);
      c.lineTo(120, 128);
      c.lineTo(69, 128);
      c.fill();
    }),
    roughness: 0.24,
    metalness: 0.18,
  }));
}
export function alloy() {
  return (rim ??= new T.MeshStandardMaterial({
    map: tex(128, 128, (c) => {
      c.fillStyle = "#201e23";
      c.fillRect(0, 0, 128, 128);
      c.translate(64, 64);
      c.strokeStyle = "#b5abb1";
      c.lineWidth = 6;
      c.beginPath();
      c.arc(0, 0, 44, 0, Math.PI * 2);
      c.stroke();
      for (let i = 0; i < 8; i++) {
        c.rotate(Math.PI / 4);
        c.fillStyle = "#a9a8b1";
        c.beginPath();
        c.moveTo(-6, -7);
        c.lineTo(0, -44);
        c.lineTo(9, -42);
        c.lineTo(5, -6);
        c.fill();
      }
      c.fillStyle = "#d8c9bd";
      c.beginPath();
      c.arc(0, 0, 10, 0, 7);
      c.fill();
    }),
    metalness: 0.32,
    roughness: 0.38,
  }));
}
