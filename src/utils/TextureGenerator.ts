import * as T from "three";
let seed = 731;
export function rand() {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed / 4294967296;
}
export function tex(
  w: number,
  h: number,
  paint: (c: CanvasRenderingContext2D) => void,
) {
  let a = document.createElement("canvas");
  a.width = w;
  a.height = h;
  paint(a.getContext("2d")!);
  let t = new T.CanvasTexture(a);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function grain(base: string) {
  let t = tex(128, 128, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4000; i++) {
      c.fillStyle = rand() < 0.5 ? "#ffffff10" : "#00000022";
      c.fillRect(rand() * 128, rand() * 128, 2, 1);
    }
  });
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(70, 70);
  return t;
}
export function facade(rows: number, cols: number) {
  return tex(cols * 16, rows * 16, (c) => {
    const w = c.canvas.width,
      h = c.canvas.height;
    c.fillStyle = ["#302943", "#27283f", "#3a3049"][Math.floor(rand() * 3)];
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        let v = rand();
        c.fillStyle =
          v < 0.45
            ? "#242339"
            : v < 0.65
              ? "#544360"
              : v < 0.8
                ? "#937b91"
                : v < 0.93
                  ? "#edbb99"
                  : "#fae1b9";
        c.fillRect(x * 16 + 3, y * 16 + 4, 9, 7);
        c.fillStyle = "#241f3344";
        c.fillRect(x * 16 + 7, y * 16 + 4, 1, 7);
      }
  });
}
export const mat = (color: T.ColorRepresentation) =>
  new T.MeshStandardMaterial({ color, roughness: 0.82, flatShading: true });
export const lit = (color: T.ColorRepresentation) =>
  new T.MeshBasicMaterial({ color });
const cube = new T.BoxGeometry();
export function box(
  p: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  m: T.Material | T.Material[],
) {
  let o = new T.Mesh(cube, m);
  o.scale.set(w, h, d);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  p.add(o);
  return o;
}
