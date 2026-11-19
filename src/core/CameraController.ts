import * as T from "three";
import type { InputManager } from "./InputManager";
import type { Player } from "../entities/Player";
export class CameraController {
  cam = new T.PerspectiveCamera(60, 1, 0.08, 620);
  yaw = 0;
  pitch = 0.16;
  ray = new T.Raycaster();
  private heading = 0;
  private elevation = this.pitch;
  private radius = 5.1;
  private shoulder = 0;
  private pivot = new T.Vector3();
  private direction = new T.Vector3();
  idle = 0;
  update(p: Player, i: InputManager, solid: T.Object3D[], dt: number) {
    this.idle = i.dx || i.dy ? 0 : this.idle + dt;
    if (p.car && this.idle > 1.2 && p.car.body.velocity.length() > 2) {
      const f = this.direction.set(0, 0, 1).applyQuaternion(p.car.g.quaternion);
      const a = Math.atan2(f.x, f.z) - this.yaw;
      this.yaw +=
        Math.atan2(Math.sin(a), Math.cos(a)) * (1 - Math.exp(-2 * dt));
    }
    this.yaw -= i.dx * 0.003;
    this.pitch = T.MathUtils.clamp(this.pitch + i.dy * 0.003, -1.25, 1.42);
    i.dx = i.dy = 0;
    const damping = 1 - Math.exp(-16 * dt);
    const turn = this.yaw - this.heading;
    this.heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * damping;
    this.elevation += (this.pitch - this.elevation) * damping;
    const aim = !p.car && i.keys.has("Aim");
    this.shoulder += ((aim ? 0.67 : 0) - this.shoulder) * damping;
    const r = p.car ? 8 : aim ? 2.4 : 5.1;
    // The orbit and the optical axis share one pivot, even when the arm retracts.
    const a = this.pivot.set(
      p.pos.x + Math.cos(this.heading) * this.shoulder,
      p.pos.y + (p.car ? 1 : 0.81),
      p.pos.z - Math.sin(this.heading) * this.shoulder,
    );
    const phi = this.elevation;
    const d = this.direction.set(
      Math.sin(this.heading) * Math.cos(phi),
      Math.sin(phi),
      Math.cos(this.heading) * Math.cos(phi),
    );
    this.ray.set(a, d);
    // Retract toward the pivot at low angles instead of freezing the pitch
    // at the horizon or moving the camera below street level.
    const reach = d.y < 0 ? Math.min(r, Math.max(0.1, (a.y - 0.3) / -d.y)) : r;
    this.ray.far = reach;
    const hit = this.ray.intersectObjects(solid, false)[0];
    const limit = hit ? Math.max(0.1, hit.distance - 0.22) : reach;
    this.radius = Math.min(
      limit,
      this.radius + (limit - this.radius) * damping,
    );
    this.cam.position.copy(a).addScaledVector(d, this.radius);
    this.cam.lookAt(a);
    this.cam.fov +=
      ((aim ? 42 : p.car ? 68 : i.keys.has("ShiftLeft") ? 65 : 60) -
        this.cam.fov) *
      (1 - Math.exp(-7 * dt));
    this.cam.updateProjectionMatrix();
  }
}
