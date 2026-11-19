import * as T from "three";
import { Player } from "./Player";
import * as C from "cannon-es";
import { vitality } from "./Vitality";
import { person, gait } from "./CharacterModel";
import { rand, tex } from "../utils/TextureGenerator";
import type { Vehicle } from "./Vehicle";
export class NPC {
  model;
  hp = 100;
  crossing = false;
  pinned = false;
  private fall?: C.Body;
  private down = 0;
  private immunity = 0;
  private previousHp = 100;
  private label = new T.Sprite(new T.SpriteMaterial({ depthTest: false }));
  private bar = new T.Sprite(
    new T.SpriteMaterial({ color: "#7ce0ac", depthTest: false }),
  );
  playerKill = false;
  hurt(damage: number, byPlayer = false) {
    if (this.hp === 0) return;
    this.hp = Math.max(0, this.hp - Math.max(0, Math.round(damage)));
    if (this.hp === 0) this.playerKill = byPlayer;
  }
  get condition() {
    return vitality(this.hp);
  }
  impact(car: Vehicle, world: C.World, byPlayer = false) {
    if (!this.hp || this.fall || this.immunity > 0) return false;
    let p = this.model.g.position,
      v = car.body.velocity,
      speed = Math.hypot(v.x, v.z);
    if (speed < 1.6 || Math.abs(p.y + 0.75 - car.body.position.y) > 1.4)
      return false;
    let q = car.body.pointToLocalFrame(new C.Vec3(p.x, p.y + 0.75, p.z));
    if (Math.abs(q.x) > 1.32 || Math.abs(q.z) > 2.53) return false;
    this.hurt(speed * 5.5, byPlayer);
    this.down = 0.85 + Math.min(1, speed * 0.06);
    this.fall = new C.Body({
      mass: 65,
      linearDamping: 0.68,
      shape: new C.Sphere(0.34),
      position: new C.Vec3(p.x, p.y + 0.5, p.z),
    });
    world.addBody(this.fall);
    const impulse = new C.Vec3(v.x * 30, Math.min(150, speed * 11), v.z * 30);
    this.fall.applyImpulse(impulse);
    car.body.applyImpulse(impulse.negate());
    return true;
  }
  reset(node: string) {
    this.fall?.world?.removeBody(this.fall);
    this.fall = undefined;
    this.hp = 100;
    this.playerKill = false;
    this.node = this.next = node;
    this.crossing = false;
    this.rest = this.fear = this.immunity = this.down = 0;
    this.previous = "";
    this.model.g.rotation.set(0, 0, 0);
    const [x, z] = node.split(",").map(Number);
    this.model.g.position.set(x, 0.24, z);
  }
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
    this.model.g.add(this.label);
    this.label.position.y = 2.36;
    this.label.scale.set(1.7, 0.265, 1);
    this.label.visible = false;
    this.label.raycast = this.bar.raycast = () => {};
    this.model.g.add(this.bar);
    this.bar.position.y = 2.18;
    this.bar.visible = false;
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
    const info = this.condition;
    this.crossing = false;
    this.immunity -= dt;
    const nearby = Math.hypot(at.x - p.pos.x, at.z - p.pos.z) < 16;
    this.label.visible = nearby && this.hp < 100 && this.hp > 0;
    if (this.label.visible && this.hp !== this.previousHp) {
      this.previousHp = this.hp;
      this.label.material.map?.dispose();
      this.label.material.map = tex(256, 40, (ctx) => {
        ctx.fillStyle = "#211c30dc";
        ctx.fillRect(0, 0, 256, 40);
        ctx.fillStyle = "#fff1d8";
        ctx.textAlign = "center";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(`${this.hp}% · ${info.label}`, 128, 26);
      });
      this.label.material.needsUpdate = true;
    }
    this.bar.visible = this.label.visible;
    this.bar.scale.set((0.68 * this.hp) / 100, 0.055, 1);
    this.bar.material.color.setHSL(this.hp / 350, 0.7, 0.56);
    if (this.fall) {
      let f = this.fall;
      this.state = "down";
      at.set(f.position.x, Math.max(0.22, f.position.y - 0.12), f.position.z);
      g.rotation.x += (-1.48 - g.rotation.x) * Math.min(1, dt * 9);
      this.down -= dt;
      if (this.down > 0) return;
      f.world?.removeBody(f);
      this.fall = undefined;
      this.immunity = 1.1;
    }
    if (!this.hp) {
      this.state = "dead";
      g.rotation.x += (-1.49 - g.rotation.x) * Math.min(1, dt * 7);
      at.y = 0.23;
      return;
    }
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
    this.crossing = this.node !== this.next && Math.hypot(nx - x, nz - z) < 20;
    if (this.crossing && Math.hypot(nx - at.x, nz - at.z) < 0.6) {
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
    speed *= info.speed;
    let step = Math.min(speed * dt, len);
    at.x += (dx / len) * step;
    at.z += (dz / len) * step;
    let turn = Math.atan2(-dx, -dz) - g.rotation.y;
    g.rotation.y +=
      Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, 9 * dt);
    this.phase += step * 3.8;
    gait(
      this.model,
      this.phase,
      speed,
      dt,
      info.level,
      !!this.fear && info.level < 3,
    );
    if (this.state === "engage") this.model.limbs[3].rotation.x = 1.15;
  }
}
