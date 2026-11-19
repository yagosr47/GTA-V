import * as T from "three";
import { person, Player } from "./Player";
import { rand } from "../utils/TextureGenerator";
export class NPC {
  model;
  hp = 60;
  state = "patrol";
  node: string;
  next: string;
  cool = 0;
  phase = 0;
  ray = new T.Raycaster();
  constructor(
    s: T.Scene,
    public graph: Map<string, string[]>,
    public cop: boolean,
    node: string,
  ) {
    this.model = person(
      cop
        ? "#344661"
        : ["#c47a61", "#67918f", "#835987"][Math.floor(rand() * 3)],
    );
    this.node = this.next = node;
    let [x, z] = node.split(",").map(Number);
    this.model.g.position.set(x, 0.25, z);
    s.add(this.model.g);
  }
  step(p: Player, alarm: number, dt: number, solid: T.Object3D[]) {
    let g = this.model.g;
    g.visible = this.hp > 0;
    if (!g.visible) return;
    let dx = p.pos.x - g.position.x,
      dz = p.pos.z - g.position.z,
      dist = Math.hypot(dx, dz);
    this.state =
      alarm && dist < 35 ? (this.cop ? "pursue" : "panic") : "patrol";
    let speed = this.state === "patrol" ? 1.3 : 3.7;
    if (this.state === "pursue") {
      this.cool -= dt;
      if (dist < 14 && this.cool < 0) {
        let d = new T.Vector3(dx, p.pos.y - g.position.y, dz).normalize();
        this.ray.set(g.position.clone().add(new T.Vector3(0, 1, 0)), d);
        this.ray.far = dist;
        if (!this.ray.intersectObjects(solid, false).length) p.hurt(4);
        this.cool = 2;
      }
      if (dist < 6) speed = 0;
    } else {
      let [x, z] = this.next.split(",").map(Number);
      dx = x - g.position.x;
      dz = z - g.position.z;
      if (Math.hypot(dx, dz) < 0.4) {
        this.node = this.next;
        let options = this.graph.get(this.node)!;
        this.next =
          this.state === "panic"
            ? [...options].sort((a, b) => {
                let v = (n: string) => {
                  let [x, z] = n.split(",").map(Number);
                  return Math.hypot(x - p.pos.x, z - p.pos.z);
                };
                return v(b) - v(a);
              })[0]
            : options[Math.floor(rand() * options.length)];
      }
    }
    let len = Math.hypot(dx, dz) || 1;
    g.position.x += (dx / len) * speed * dt;
    g.position.z += (dz / len) * speed * dt;
    g.rotation.y = Math.atan2(-dx, -dz);
    this.phase += dt * speed * 3;
    this.model.limbs.forEach(
      (l, i) =>
        (l.rotation.x =
          Math.sin(this.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45),
    );
  }
}
