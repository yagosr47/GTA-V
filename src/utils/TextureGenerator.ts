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
/** A storey is mapped to roughly three world metres. Albedo and window light
 * use the very same room layout so the masonry itself never glows. */
export function facade(rows: number, style: number) {
  const cols = style === 2 ? 5 : 4,
    cell = 48,
    w = cols * cell,
    h = rows * cell;
  const rooms = Array.from({ length: rows * cols }, () => ({
    on: rand() < 0.31,
    shade: rand(),
    blind: rand(),
    lamp: rand(),
  }));
  const rect = (
    c: CanvasRenderingContext2D,
    color: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    c.fillStyle = color;
    c.fillRect(x, y, width, height);
  };
  const base = tex(w, h, (c) => {
    rect(c, ["#957e74", "#a49d98", "#506471"][style], 0, 0, w, h);
    if (style === 0) {
      for (let y = 0; y < h; y += 5) {
        rect(c, "#35293644", 0, y, w, 0.8);
        for (let x = -9; x < w; x += 17) {
          let left = x + (y % 10 ? 8 : 0);
          rect(c, "#382d3a55", left, y, 1, 5);
          rect(
            c,
            rand() < 0.5 ? "#d5a28330" : "#5b3f4933",
            left + 1,
            y + 1,
            15,
            3,
          );
        }
      }
    }
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        let x = i * cell,
          y = j * cell,
          r = rooms[j * cols + i],
          inset = style === 2 ? 2 : 7,
          top = style === 2 ? 3 : 8,
          width = cell - 2 * inset,
          height = style === 2 ? 38 : 28;
        rect(c, "#1d202955", x, y, cell, 2);
        rect(c, "#e8d1bf55", x, y + 2, cell, 1);
        rect(c, "#473f461c", x, y, 2, cell);
        x += inset;
        y += top;
        rect(c, "#2b2932", x - 2, y - 2, width + 4, height + 4);
        let gr = c.createLinearGradient(x, y, x + width * 0.35, y + height);
        gr.addColorStop(0, r.on ? "#d09564" : "#8392a2");
        gr.addColorStop(
          0.56,
          r.on ? "#f4c78b" : r.shade > 0.5 ? "#586578" : "#475365",
        );
        gr.addColorStop(1, r.on ? "#90786c" : "#293746");
        c.fillStyle = gr;
        c.fillRect(x, y, width, height);
        if (r.blind > 0.32) {
          let n = Math.floor(3 + r.blind * 11);
          rect(c, r.on ? "#ae9281" : "#697482", x, y, width, n);
          for (let k = 2; k < n; k += 3)
            rect(c, "#1b253d44", x, y + k, width, 1);
        }
        rect(c, "#39363c", x + width / 2 - 1, y, 2, height);
        rect(c, "#352e3955", x, y + height * 0.65, width, 1.5);
        rect(c, "#cdc1b6", x - 2, y + height + 1, width + 4, 2);
        rect(c, "#28242e70", x - 2, y + height + 3, width + 4, 2);
      }
  });
  const light = tex(w, h, (c) => {
    rect(c, "#000000", 0, 0, w, h);
    rooms.forEach((r, k) => {
      if (!r.on) return;
      let inset = style === 2 ? 2 : 7,
        top = style === 2 ? 3 : 8,
        height = style === 2 ? 38 : 28,
        width = cell - 2 * inset,
        x = (k % cols) * cell + inset,
        y = Math.floor(k / cols) * cell + top,
        blind = r.blind > 0.32 ? Math.floor(3 + r.blind * 11) : 0;
      rect(
        c,
        r.lamp > 0.5 ? "#ffc986" : "#e7c9ab",
        x,
        y + blind,
        width,
        height - blind,
      );
      rect(c, "#000000", x + width / 2 - 1, y, 2, height);
    });
  });
  return new T.MeshStandardMaterial({
    map: base,
    emissiveMap: light,
    emissive: "#fff1d7",
    emissiveIntensity: 0.52,
    roughness: style === 2 ? 0.38 : 0.89,
    metalness: style === 2 ? 0.2 : 0.02,
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
