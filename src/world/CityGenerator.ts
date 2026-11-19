import * as T from "three";
import * as C from "cannon-es";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  box,
  mat,
  lit,
  rand,
  tex,
  grain,
  facade,
} from "../utils/TextureGenerator";
export class CityGenerator {
  solid: T.Object3D[] = [];
  roads = new Map<string, string[]>();
  walk = new Map<string, string[]>();
  sun = new T.Group();
  sky!: T.Mesh<T.SphereGeometry, T.ShaderMaterial>;
  constructor(
    public s: T.Scene,
    public world: C.World,
  ) {
    let g = new T.Group();
    s.add(g);
    const curb = mat("#76647a"),
      pink = lit("#ff419e"),
      cyan = lit("#45eeee"),
      stripe = lit("#d99d60"),
      white = lit("#aea0a9"),
      steel = mat("#392e45"),
      grass = mat("#173d40");
    let asphalt = grain("#514656");
    box(
      g,
      0,
      -0.12,
      0,
      480,
      0.24,
      480,
      new T.MeshStandardMaterial({ map: asphalt, roughnessMap: asphalt }),
    );
    this.collider(0, -1, 0, 480, 2, 480);
    let faces = Array.from({ length: 8 }, (_, i) => {
      let map = facade(10 + i * 2, 10);
      return new T.MeshStandardMaterial({
        map,
        emissiveMap: map,
        emissive: "#ffffff",
        emissiveIntensity: 0.55,
      });
    });
    for (let i = -4; i < 4; i++)
      for (let j = -4; j < 4; j++) {
        let x = i * 52 + 26,
          z = j * 52 + 26;
        for (let [graph, off] of [
          [this.roads, 0],
          [this.walk, 10],
        ] as const) {
          let k = `${i * 52 + off},${j * 52 + off}`;
          graph.set(
            k,
            [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ]
              .filter(
                ([a, b]) =>
                  i + a >= -4 && i + a < 4 && j + b >= -4 && j + b < 4,
              )
              .map(([a, b]) => `${(i + a) * 52 + off},${(j + b) * 52 + off}`),
          );
        }
        box(g, x, 0.1, z, 35, 0.25, 35, curb);
        for (let a of [-8, 8])
          for (let b of [-8, 8]) {
            let h =
                6 +
                rand() ** 1.5 *
                  (((i === 0 && a < 0) || (i === -1 && a > 0)) &&
                  Math.abs(j) < 2
                    ? 12
                    : 53),
              w = 11 + rand() * 4,
              d = 11 + rand() * 4;
            let m = faces[Math.floor(rand() * 8)];
            let o = box(g, x + a, h / 2 + 0.24, z + b, w, h, d, m);
            this.solid.push(o);
            this.collider(x + a, h / 2, z + b, w, h + 0.5, d);
            box(
              g,
              x + a,
              h + 0.4,
              z + b,
              w + 0.2,
              0.35,
              d + 0.2,
              rand() < 0.22 ? pink : steel,
            );
            box(g, x + a, h + 1, z + b, w * 0.66, 1.8, d * 0.75, steel);
          }
        for (let n = -20; n <= 20; n += 5) {
          for (let l of [-0.13, 0.13]) {
            box(g, i * 52 + l, 0.018, z + n, 0.11, 0.025, 3.1, stripe);
            box(g, x + n, 0.018, j * 52 + l, 3.1, 0.025, 0.11, stripe);
          }
        }
        for (let n = -6; n <= 6; n += 1.6) {
          box(g, i * 52 + n, 0.025, j * 52 - 8, 0.72, 0.02, 2, white);
          box(g, i * 52 - 8, 0.025, j * 52 + n, 2, 0.02, 0.72, white);
        }
        box(g, i * 52 + 8.2, 2.8, z, 0.14, 5.6, 0.14, steel);
        box(g, i * 52 + 7.35, 5.6, z, 1.8, 0.13, 0.32, cyan);
        if (i === -1 || i === 0 || rand() < 0.25)
          this.palm(g, i * 52 + (i === -1 ? 43 : 8.9), z - 9, steel, grass);
      }
    for (let [x, z, label, col] of [
      [-10, -16, "MOTEL", "#ff52b1"],
      [10, -32, "ARCADE", "#53ffea"],
      [-10, -74, "NOVA", "#8bf7fc"],
      [10, 18, "HOTEL", "#ff7399"],
    ] as const) {
      let t = tex(160, 480, (c) => {
        c.fillStyle = "#292035";
        c.fillRect(0, 0, 160, 480);
        c.strokeStyle = col;
        c.lineWidth = 6;
        c.strokeRect(6, 6, 148, 468);
        c.fillStyle = col;
        c.font = "bold 76px sans-serif";
        c.textAlign = "center";
        [...label].forEach((l, i) => c.fillText(l, 80, 82 + i * 83));
      });
      box(g, x, 8, z, 2.3, 7, 0.42, new T.MeshBasicMaterial({ map: t }));
    }
    for (let [x, z] of [
      [-8.8, 2],
      [8.8, 0],
      [-8.8, -29],
      [8.8, -38],
    ])
      this.palm(g, x, z, steel, grass);
    // Shop fronts line the near boulevard; a single atlas supplies the illuminated lettering.
    const shopNames = [
      "SUNSET RECORDS",
      "MIDNIGHT VIDEO",
      "OCEAN DRIVE",
      "NEON PALMS",
      "CLUB PARADISE",
      "EASTSIDE",
    ];
    for (let side of [-1, 1])
      for (let j = -2; j < 2; j++)
        for (let b of [-8, 8]) {
          let z = j * 52 + 26 + b,
            x = side * 10.8,
            accent = side < 0 ? pink : cyan;
          let name = shopNames[Math.floor(rand() * shopNames.length)];
          let sign = tex(512, 80, (c) => {
            c.fillStyle = "#2b2037";
            c.fillRect(0, 0, 512, 80);
            c.fillStyle = side < 0 ? "#ff9dcc" : "#8bf8eb";
            c.font = "italic bold 42px sans-serif";
            c.textAlign = "center";
            c.fillText(name, 256, 54);
          });
          let wall = box(g, x, 2, z, 12, 4, 1.4, steel);
          wall.rotation.y = (-side * Math.PI) / 2;
          this.collider(x, 2, z, 1.4, 4, 12);
          this.solid.push(wall);
          let fascia = box(
            g,
            x - side * 0.8,
            3.5,
            z,
            12,
            1.2,
            0.1,
            new T.MeshBasicMaterial({ map: sign }),
          );
          fascia.rotation.y = (-side * Math.PI) / 2;
          for (let dz = -4; dz <= 4; dz += 4) {
            box(
              g,
              x - side * 0.8,
              1.55,
              z + dz,
              0.2,
              2.35,
              3.55,
              mat("#364051"),
            );
            box(g, x - side * 0.92, 1.45, z + dz, 0.08, 0.075, 3.55, accent);
          }
          box(g, x - side * 0.9, 4.2, z, 0.7, 0.12, 12.4, accent);
          box(g, x - side * 0.9, 2.83, z, 0.75, 0.1, 12.4, accent);
        }
    // Batch static scenery while retaining individual boxes for camera queries.
    g.updateMatrixWorld(true);
    let groups = new Map<T.Material, T.BufferGeometry[]>();
    for (let o of [...g.children])
      if (o instanceof T.Mesh) {
        let geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
        let list = groups.get(o.material) || [];
        list.push(geo);
        groups.set(o.material, list);
        g.remove(o);
      }
    for (let [m, geos] of groups) {
      let merged = mergeGeometries(geos);
      let mesh = new T.Mesh(merged, m);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      g.add(mesh);
      geos.forEach((v) => v.dispose());
    }
    let sky = new T.Mesh(
      new T.SphereGeometry(360, 48, 32),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new T.Color("#453576") },
          low: { value: new T.Color("#ffb48b") },
        },
        vertexShader:
          "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec3 v;uniform vec3 top,low;void main(){float h=normalize(v).y;gl_FragColor=vec4(mix(low,top,smoothstep(-.02,.52,h)),1.);\n#include <colorspace_fragment>\n}",
      }),
    );
    this.sky = sky;
    sky.renderOrder = -100;
    sky.frustumCulled = false;
    s.add(sky);
    let sunTex = tex(256, 256, (c) => {
      let gr = c.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "#fff6b4");
      gr.addColorStop(1, "#ff6192");
      c.fillStyle = gr;
      c.beginPath();
      c.arc(128, 128, 126, 0, 7);
      c.fill();
      for (let y = 130; y < 255; y += 14)
        c.clearRect(0, y, 256, (y - 100) / 18);
    });
    let sun = new T.Sprite(new T.SpriteMaterial({ map: sunTex, fog: false }));
    sun.scale.set(66, 66, 1);
    this.sun.add(sun);
    this.sun.position.set(-5, 45, -380);
    s.add(this.sun);
    let stars = new Float32Array(2100);
    for (let j = 0; j < stars.length; j += 3) {
      let a = rand() * Math.PI * 2,
        h = rand() * 0.83 + 0.15;
      stars[j] = Math.cos(a) * Math.sqrt(1 - h * h) * 310;
      stars[j + 1] = h * 310;
      stars[j + 2] = Math.sin(a) * Math.sqrt(1 - h * h) * 310;
    }
    let sg = new T.BufferGeometry();
    sg.setAttribute("position", new T.BufferAttribute(stars, 3));
    let points = new T.Points(
      sg,
      new T.PointsMaterial({
        color: "#ffdddb",
        size: 0.42,
        transparent: true,
        opacity: 0.65,
        fog: false,
      }),
    );
    sky.add(points);
  }
  collider(x: number, y: number, z: number, w: number, h: number, d: number) {
    let b = new C.Body({
      mass: 0,
      shape: new C.Box(new C.Vec3(w / 2, h / 2, d / 2)),
      position: new C.Vec3(x, y, z),
    });
    this.world.addBody(b);
  }
  palm(g: T.Group, x: number, z: number, tr: T.Material, leaf: T.Material) {
    let h = 7 + rand() * 3;
    box(g, x, h / 2, z, 0.38, h, 0.38, tr).rotation.z = 0.035;
    for (let k = 0; k < 9; k++) {
      let a = k * 0.698 + rand() * 0.3;
      let geo = new T.BufferGeometry(),
        verts: number[] = [];
      for (let n = 0; n < 7; n++) {
        let t = n / 7,
          u = (n + 1) / 7,
          Y = (v: number) => Math.sin(v * 2.7) * 1.3 - v * v * 1.6;
        verts.push(t * 4.4, Y(t), -0.08, u * 4.4, Y(u), 0, t * 4.4, Y(t), 0.08);
        for (let side of [-1, 1])
          verts.push(
            t * 4.4,
            Y(t),
            0,
            u * 4.4,
            Y(u),
            0,
            u * 4.4 + 0.29,
            Y(u) - 0.24,
            side * (Math.sin(u * 3) * 0.58 + 0.08),
          );
      }
      geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      geo.setAttribute(
        "uv",
        new T.Float32BufferAttribute(
          new Array((verts.length / 3) * 2).fill(0),
          2,
        ),
      );
      geo.setIndex(Array.from({ length: verts.length / 3 }, (_, i) => i));
      leaf.side = T.DoubleSide;
      let o = new T.Mesh(geo, leaf);
      o.position.set(x - 0.15, h, z);
      o.rotation.y = a;
      g.add(o);
    }
  }
}
