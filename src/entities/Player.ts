import * as T from "three";
import * as C from "cannon-es";
import { box, mat } from "../utils/TextureGenerator";
import type { Vehicle } from "./Vehicle";
import { person } from "./CharacterModel";
export class Player {
  model = person("#963d66");
  body = new C.Body({
    mass: 72,
    allowSleep: false,
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
    // Horizontal velocity is controlled by move(); static-contact friction must not
    // cancel it in the solver. Vehicles retain their normal contact materials.
    this.body.material = new C.Material("pedestrian");
    world.addContactMaterial(
      new C.ContactMaterial(this.body.material, world.defaultMaterial, {
        friction: 0,
        restitution: 0,
      }),
    );
    this.model.limbs[3].add(this.gun);
    this.gun.position.set(0, -0.61, 0);
    let steel = mat("#333242");
    box(this.gun, 0, 0, 0, 0.09, 0.14, 0.11, steel);
    this.barrel = box(this.gun, 0, -0.12, -0.03, 0.1, 0.27, 0.1, steel);
    this.gun.visible = false;
    this.body.addShape(new C.Sphere(0.42), new C.Vec3(0, 0.9, 0));
    this.body.position.set(3, 0.5, 20);
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
    this.body.wakeUp();
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
