import * as T from "three";
import type { InputManager } from "./InputManager";
import type { Player } from "../entities/Player";
export class CameraController {
  cam = new T.PerspectiveCamera(60, 1, 0.08, 620);
  yaw = 0;
  pitch = 0.16;
  ray = new T.Raycaster();
  init = false;
  idle = 0;
  update(p: Player, i: InputManager, solid: T.Object3D[], dt: number) {
    this.idle = i.dx || i.dy ? 0 : this.idle + dt;
    if (p.car && this.idle > 1.2 && p.car.body.velocity.length() > 2) {
      let f = new T.Vector3(0, 0, 1).applyQuaternion(p.car.g.quaternion),
        a = Math.atan2(f.x, f.z) - this.yaw;
      this.yaw +=
        Math.atan2(Math.sin(a), Math.cos(a)) * (1 - Math.exp(-2 * dt));
    }
    this.yaw -= i.dx * 0.003;
    this.pitch = T.MathUtils.clamp(this.pitch + i.dy * 0.003, -0.3, 1);
    i.dx = i.dy = 0;
    let aim = i.keys.has("Aim"),
      r = p.car ? 8 : aim ? 2.4 : 5.1,
      a = new T.Vector3(p.pos.x, p.pos.y + (p.car ? 1.2 : 1.13), p.pos.z);
    a.x += Math.cos(this.yaw) * (aim ? 0.6 : 0.24);
    let d = new T.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.ray.set(a, d);
    this.ray.far = r;
    let hit = this.ray.intersectObjects(solid, false)[0];
    let dest = a
      .clone()
      .addScaledVector(d, hit ? Math.max(0.25, hit.distance - 0.22) : r);
    this.cam.position.lerp(dest, this.init ? 1 - Math.exp(-14 * dt) : 1);
    this.init = true;
    this.cam.lookAt(a.x - d.x * 6, a.y + 0.65, a.z - d.z * 6);
    this.cam.fov +=
      ((aim ? 42 : p.car ? 68 : i.keys.has("ShiftLeft") ? 65 : 60) -
        this.cam.fov) *
      (1 - Math.exp(-7 * dt));
    this.cam.updateProjectionMatrix();
  }
}
