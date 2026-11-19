import * as T from "three";
import * as C from "cannon-es";
import { box, mat, lit, tex } from "../utils/TextureGenerator";
import type { Vehicle } from "./Vehicle";
export function person(coat: string) {
  let g = new T.Group(),
    skin = mat("#b17d65"),
    hair = mat("#231e28"),
    jacket = mat(coat),
    pants = mat("#242838"),
    boot = mat("#1d1b25");
  box(g, 0, 1.25, 0, 0.6, 0.68, 0.35, jacket);
  box(g, 0, 1.05, 0.181, 0.52, 0.035, 0.014, lit("#d04c81"));
  box(g, 0, 1.55, 0, 0.49, 0.13, 0.37, hair);
  box(g, 0, 1.79, 0, 0.34, 0.39, 0.32, skin);
  box(g, 0, 1.98, 0.015, 0.37, 0.14, 0.36, hair);
  box(g, 0, 1.86, 0.15, 0.35, 0.21, 0.08, hair);
  let patch = tex(128, 128, (c) => {
    c.fillStyle = "#563249";
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = "#dca28c";
    c.lineWidth = 5;
    c.strokeRect(5, 5, 118, 118);
    c.fillStyle = "#e7b89b";
    c.font = "bold 22px sans-serif";
    c.textAlign = "center";
    c.fillText("NIGHT", 64, 31);
    c.beginPath();
    c.moveTo(77, 37);
    c.lineTo(39, 78);
    c.lineTo(59, 78);
    c.lineTo(48, 108);
    c.lineTo(90, 62);
    c.lineTo(69, 62);
    c.fill();
  });
  box(
    g,
    0,
    1.32,
    0.183,
    0.26,
    0.26,
    0.014,
    new T.MeshBasicMaterial({ map: patch }),
  );
  box(g, 0, 0.96, 0, 0.59, 0.1, 0.36, hair);
  box(g, 0.17, 0.96, 0.185, 0.09, 0.08, 0.02, mat("#b4a4a5"));
  box(g, -0.1, 2.055, 0.01, 0.22, 0.06, 0.32, hair);
  let limbs: T.Group[] = [];
  for (let k = 0; k < 4; k++) {
    let arm = k > 1,
      side = k % 2 ? 1 : -1,
      j = new T.Group();
    g.add(j);
    j.position.set(side * (arm ? 0.37 : 0.16), arm ? 1.52 : 0.99, 0);
    box(
      j,
      0,
      arm ? -0.18 : -0.44,
      0,
      arm ? 0.21 : 0.26,
      arm ? 0.41 : 0.86,
      arm ? 0.26 : 0.29,
      arm ? jacket : pants,
    );
    box(
      j,
      0,
      arm ? -0.48 : -0.88,
      -0.03,
      arm ? 0.16 : 0.27,
      arm ? 0.23 : 0.16,
      arm ? 0.2 : 0.39,
      arm ? skin : boot,
    );
    if (arm) {
      box(j, 0, -0.37, 0, 0.215, 0.065, 0.27, hair);
      j.rotation.z = side * 0.08;
    } else {
      box(j, 0, -0.43, 0.141, 0.21, 0.035, 0.015, mat("#4a4557"));
      box(j, 0, -0.95, -0.03, 0.275, 0.045, 0.4, mat("#726874"));
    }
    limbs.push(j);
  }
  return { g, limbs };
}
export class Player {
  model = person("#963d66");
  body = new C.Body({
    mass: 72,
    fixedRotation: true,
    linearDamping: 0.15,
    shape: new C.Sphere(0.43),
  });
  car: Vehicle | null = null;
  health = 100;
  armor = 75;
  phase = 0;
  gun = new T.Group();
  barrel: T.Mesh;
  ground = false;
  constructor(
    public world: C.World,
    s: T.Scene,
  ) {
    this.model.limbs[3].add(this.gun);
    this.gun.position.set(0, -0.61, 0);
    let steel = mat("#333242");
    box(this.gun, 0, 0, 0, 0.09, 0.14, 0.11, steel);
    this.barrel = box(this.gun, 0, -0.12, -0.03, 0.1, 0.27, 0.1, steel);
    this.gun.visible = false;
    this.body.addShape(new C.Sphere(0.42), new C.Vec3(0, 0.9, 0));
    this.body.position.set(-2, 0.5, 20);
    world.addBody(this.body);
    s.add(this.model.g);
  }
  get pos() {
    return this.car?.body.position ?? this.body.position;
  }
  move(
    x: number,
    z: number,
    yaw: number,
    jump: boolean,
    sprint: boolean,
    dt: number,
  ) {
    if (this.car) return;
    let dx = x * Math.cos(yaw) - z * Math.sin(yaw),
      dz = -z * Math.cos(yaw) - x * Math.sin(yaw),
      v = this.body.velocity;
    v.x += (dx * (sprint ? 8 : 4) - v.x) * 0.3;
    v.z += (dz * (sprint ? 8 : 4) - v.z) * 0.3;
    this.ground = this.world.contacts.some(
      (c) =>
        (c.bi === this.body && c.ni.y < -0.55) ||
        (c.bj === this.body && c.ni.y > 0.55),
    );
    if (jump && this.ground) v.y = 6;
    if (Math.hypot(dx, dz) > 0.05)
      this.model.g.rotation.y = Math.atan2(-dx, -dz);
    this.phase += Math.hypot(v.x, v.z) * dt * 2.8;
    this.model.limbs.forEach(
      (l, i) =>
        (l.rotation.x =
          Math.sin(this.phase + (i === 0 || i === 3 ? 0 : Math.PI)) *
          Math.min(0.7, Math.hypot(v.x, v.z) * 0.16)),
    );
  }
  pose(aim: boolean, yaw: number, slot: number) {
    this.gun.visible = aim;
    if (aim) {
      this.model.g.rotation.y = yaw;
      this.model.limbs[3].rotation.x = 1.35;
      this.model.limbs[2].rotation.x = slot ? 1.1 : 0.3;
      this.barrel.scale.y = slot ? 0.52 : 0.27;
    }
  }
  sync() {
    let p = this.pos;
    this.model.g.position.set(p.x, p.y - 0.43, p.z);
    this.model.g.visible = !this.car;
  }
  enter(v: Vehicle) {
    this.world.removeBody(this.body);
    this.car = v;
  }
  exit() {
    let c = this.car!;
    let p = c.body.pointToWorldFrame(new C.Vec3(-2, 1, 0));
    this.body.position.copy(p);
    this.body.velocity.setZero();
    this.world.addBody(this.body);
    this.car = null;
    c.drive(0, 0, 1, false);
  }
  hurt(n: number) {
    let a = Math.min(this.armor, n);
    this.armor -= a;
    this.health = Math.max(0, this.health - n + a);
  }
}
