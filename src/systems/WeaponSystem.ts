import * as T from "three";
import * as C from "cannon-es";
import { TrafficAndWantedSystem } from "./TrafficAndWantedSystem";
import { SoundFX } from "../utils/SoundFX";
import { rand } from "../utils/TextureGenerator";
import { InputManager } from "../core/InputManager";
import { CameraController } from "../core/CameraController";
export class WeaponSystem {
  slot = 0;
  ammo = [12, 30];
  stock = [96, 150];
  cap = [12, 30];
  cool = 0;
  reload = 0;
  names = ["Pistola", "Carabina"];
  kills = 0;
  swap() {
    this.slot = 1 - this.slot;
    this.reload = 0;
  }
  step(
    dt: number,
    i: InputManager,
    c: CameraController,
    t: TrafficAndWantedSystem,
    a: SoundFX,
  ) {
    if (i.weaponNext) this.swap();
    let k = this.slot;
    this.cool -= dt;
    if (this.reload > 0) {
      this.reload -= dt;
      if (this.reload <= 0) {
        let n = Math.min(this.stock[k], this.cap[k] - this.ammo[k]);
        this.stock[k] -= n;
        this.ammo[k] += n;
      }
      return;
    }
    if (i.reload || (!this.ammo[k] && i.fire)) {
      if (this.stock[k] && this.ammo[k] < this.cap[k]) this.reload = 1.2;
      return;
    }
    if (!i.fire || this.cool > 0 || !this.ammo[k]) return;
    this.ammo[k]--;
    this.cool = k ? 0.12 : 0.32;
    a.pulse(true);
    t.crime();
    let ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2((rand() - 0.5) * 0.013, (rand() - 0.5) * 0.013),
      c.cam,
    );
    if (i.touch) {
      let best = 0.025;
      for (let n of t.people) {
        let d = n.model.g.position
            .clone()
            .add(new T.Vector3(0, 1, 0))
            .sub(ray.ray.origin)
            .normalize(),
          ang = d.angleTo(ray.ray.direction);
        if (n.hp > 0 && ang < best) {
          ray.ray.direction.lerp(d, 0.5).normalize();
          best = ang;
        }
      }
    }
    ray.far = 140;
    let hit = ray.intersectObjects(
      [
        ...t.city.solid,
        ...t.people.filter((n) => n.hp > 0).map((n) => n.model.g),
        ...t.cars.map((v) => v.g),
      ],
      true,
    )[0];
    if (hit) {
      let n = t.people.find((v) => v.model.g.getObjectById(hit.object.id));
      if (n) {
        n.hp -= 35;
        if (n.hp <= 0) this.kills++;
      }
      let v = t.cars.find((v) => v.g.getObjectById(hit.object.id));
      if (v) {
        v.hp -= 8;
        v.body.applyImpulse(
          new C.Vec3(...ray.ray.direction.clone().multiplyScalar(65).toArray()),
        );
      }
    }
    c.pitch -= 0.013;
  }
}
