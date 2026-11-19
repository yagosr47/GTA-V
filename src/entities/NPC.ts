import * as T from "three";
import { Player } from "./Player";
import { person } from "./CharacterModel";
import { rand } from "../utils/TextureGenerator";
import type { Vehicle } from "./Vehicle";
export class NPC {
  model;
  hp = 60;
  state = "patrol";
  node: string;
  next: string;
  cool = 0;
  phase = 0;
  private rest = 0;
  private fear = 0;
  private previous = "";
  private pace = 1.1 + rand() * 0.6;
  private ray = new T.Raycaster();
  constructor(
    s: T.Scene,
    public graph: Map<string, string[]>,
    public cop: boolean,
    node: string,
  ) {
    let style = 1 + Math.floor(rand() * 11);
    this.model = person(
      cop
        ? "#304763"
        : ["#d18056", "#458a87", "#976c9e", "#a6515b", "#738552"][style % 5],
      style,
      cop,
    );
    this.node = this.next = node;
    let [x, z] = node.split(",").map(Number);
    this.model.g.position.set(x, 0.24, z);
    s.add(this.model.g);
  }
  step(
    p: Player,
    alarm: number,
    dt: number,
    solid: T.Object3D[],
    cars: Vehicle[],
  ) {
    const g = this.model.g,
      at = g.position;
    g.visible = this.hp > 0;
    if (!g.visible) return;
    let dist = Math.hypot(p.pos.x - at.x, p.pos.z - at.z);
    this.fear = alarm && dist < 35 ? 4 : Math.max(0, this.fear - dt);
    this.state = this.fear ? (this.cop ? "pursue" : "panic") : "patrol";
    this.cool -= dt;
    this.rest = Math.max(0, this.rest - dt);
    let [x, z] = this.next.split(",").map(Number);
    if (Math.hypot(x - at.x, z - at.z) < 0.13) {
      at.x = x;
      at.z = z;
      if (this.node !== this.next) this.previous = this.node;
      this.node = this.next;
      let options = this.graph
        .get(this.node)!
        .filter((k) => k !== this.previous);
      if (!options.length) options = this.graph.get(this.node)!;
      const range = (k: string) => {
        let [x, z] = k.split(",").map(Number);
        return Math.hypot(p.pos.x - x, p.pos.z - z);
      };
      if (this.fear)
        options.sort((a, b) => (this.cop ? 1 : -1) * (range(a) - range(b)));
      this.next = this.fear
        ? options[0]
        : options[Math.floor(rand() * options.length)];
      if (!this.fear && rand() < 0.2) this.rest = 0.7 + rand() * 1.6;
      [x, z] = this.next.split(",").map(Number);
    }
    let dx = x - at.x,
      dz = z - at.z,
      len = Math.hypot(dx, dz) || 1,
      speed = this.fear ? 3.6 : this.pace;
    let [nx, nz] = this.node.split(",").map(Number);
    if (
      Math.hypot(nx - x, nz - z) < 20 &&
      Math.hypot(nx - at.x, nz - at.z) < 0.6
    ) {
      let unsafe = cars.some((c) => {
        let pos = c.body.position,
          v = c.body.velocity;
        for (let t of [0, 0.6, 1.2]) {
          let u = pos.x + v.x * t,
            w = pos.z + v.z * t;
          if (
            u >= Math.min(nx, x) - 1.3 &&
            u <= Math.max(nx, x) + 1.3 &&
            w >= Math.min(nz, z) - 2.4 &&
            w <= Math.max(nz, z) + 2.4
          )
            return true;
        }
        return false;
      });
      if (unsafe) {
        speed = 0;
        this.state = "yield";
      }
    }
    if (this.rest && !this.fear) {
      speed = 0;
      this.state = "idle";
    }
    if (this.cop && this.fear && dist < 12) {
      const origin = at.clone().add(new T.Vector3(0, 1.45, 0)),
        dir = new T.Vector3(p.pos.x, p.pos.y + 0.5, p.pos.z).sub(origin);
      this.ray.far = dir.length();
      this.ray.set(origin, dir.normalize());
      if (!this.ray.intersectObjects(solid, false).length) {
        this.state = "engage";
        speed = 0;
        dx = p.pos.x - at.x;
        dz = p.pos.z - at.z;
        if (this.cool <= 0) {
          p.hurt(4);
          this.cool = 2;
        }
      }
    }
    let step = Math.min(speed * dt, len);
    at.x += (dx / len) * step;
    at.z += (dz / len) * step;
    let turn = Math.atan2(-dx, -dz) - g.rotation.y;
    g.rotation.y +=
      Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, 9 * dt);
    this.phase += step * 3.8;
    this.model.limbs.forEach(
      (l, i) =>
        (l.rotation.x =
          this.state === "engage" && i > 1
            ? 1.15
            : Math.sin(this.phase + (i === 0 || i === 3 ? 0 : Math.PI)) *
              (speed ? 0.48 : 0.03)),
    );
  }
}
