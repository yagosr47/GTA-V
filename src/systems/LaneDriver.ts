import { Vec3 } from "cannon-es";
import { Vehicle } from "../entities/Vehicle";
import { NPC } from "../entities/NPC";
import { rand } from "../utils/TextureGenerator";
import { green, signalized } from "../world/TrafficSigns";
type Point = [number, number];
const unit = (a: Point, b: Point): Point => {
  let x = b[0] - a[0],
    z = b[1] - a[1],
    d = Math.hypot(x, z);
  return [x / d, z / d];
};
// Each list visits adjacent intersections; round the corners inside the right-hand lane.
export class LaneDriver {
  index = 1;
  turn: Point[] = [];
  wait = 0;
  held = "";
  retired = false;
  constructor(
    public route: Point[],
    public car: Vehicle,
    private graph?: Map<string, string[]>,
  ) {
    const [a, b] = route,
      [x, z] = unit(a, b);
    car.body.position.set(
      (a[0] + b[0]) / 2 - z * 3.5,
      1,
      (a[1] + b[1]) / 2 + x * 3.5,
    );
    car.body.quaternion.setFromEuler(0, Math.atan2(-x, -z), 0);
  }
  release(locks: Map<string, LaneDriver>) {
    if (this.held) locks.delete(this.held);
    this.held = "";
  }
  step(
    dt: number,
    time: number,
    cars: Vehicle[],
    people: NPC[],
    locks: Map<string, LaneDriver>,
    pursuit?: Point,
  ) {
    const car = this.car,
      p = car.body.position,
      v = car.body.velocity,
      speed = Math.hypot(v.x, v.z),
      n = this.route.length,
      b = this.route[this.index],
      a = this.route[(this.index + n - 1) % n],
      c = this.route[(this.index + 1) % n],
      [dx, dz] = unit(a, b),
      [ex, ez] = unit(b, c);
    const forward = car.body.vectorToWorldFrame(new Vec3(0, 0, -1));
    let key = b.join(","),
      along = (b[0] - p.x) * dx + (b[1] - p.z) * dz,
      desired = car.alert ? 8 : 6.5;
    let blocked = people.some((n) => {
      if (!n.crossing || n.hp <= 0) return false;
      const at = n.model.g.position,
        ox = at.x - b[0],
        oz = at.z - b[1];
      if (Math.abs(ox) > 11 || Math.abs(oz) > 11) return false;
      const [sx, sz] = n.node.split(",").map(Number),
        [fx, fz] = n.next.split(",").map(Number);
      return (
        ((dx === 0) === (sz === fz) &&
          Math.abs(ox * dx + oz * dz + 9.45) < 1) ||
        ((ex === 0) === (sz === fz) && Math.abs(ox * ex + oz * ez - 9.45) < 1)
      );
    });
    if (!this.held && along < 23) {
      let stop = along - 14.5;
      const sign = !signalized(...b);
      if (sign && stop < 1.4 && speed < 0.45) this.wait += dt;
      let permission =
        !blocked &&
        (sign ? this.wait >= 0.85 : green(dx === 0, time)) &&
        !locks.has(key);
      if (permission && stop <= 2.5) {
        this.held = key;
        locks.set(key, this);
        const start: Point = [
            b[0] - dx * 10 - dz * 3.5,
            b[1] - dz * 10 + dx * 3.5,
          ],
          end: Point = [b[0] + ex * 11 - ez * 3.5, b[1] + ez * 11 + ex * 3.5];
        const control: Point = [
          b[0] - dz * 3.5 - ez * 3.5,
          b[1] + dx * 3.5 + ex * 3.5,
        ];
        for (let j = 0; j <= 5; j++) {
          let t = j / 5,
            u = 1 - t;
          this.turn.push([
            u * u * start[0] + 2 * u * t * control[0] + t * t * end[0],
            u * u * start[1] + 2 * u * t * control[1] + t * t * end[1],
          ]);
        }
      } else if (!permission)
        desired = Math.min(desired, Math.sqrt(2 * Math.max(0, stop - 0.25)));
    }
    let tx = b[0] - dz * 3.5,
      tz = b[1] + dx * 3.5;
    if (this.turn.length) {
      desired = Math.min(desired, 3.4);
      [tx, tz] = this.turn[0];
      if (Math.hypot(tx - p.x, tz - p.z) < 2.7) {
        this.turn.shift();
        if (!this.turn.length) {
          this.release(locks);
          this.index = (this.index + 1) % n;
          this.wait = 0;
          if (this.graph) {
            const options = this.graph
              .get(c.join(","))!
              .filter((k) => k !== b.join(","))
              .map((k) => k.split(",").map(Number) as Point);
            if (pursuit)
              options.sort(
                (u, v) =>
                  Math.hypot(u[0] - pursuit[0], u[1] - pursuit[1]) -
                  Math.hypot(v[0] - pursuit[0], v[1] - pursuit[1]),
              );
            this.route = [
              b,
              c,
              options[pursuit ? 0 : Math.floor(rand() * options.length)],
            ];
            this.index = 1;
          }
        }
      }
    } else {
      let look = Math.min(along, 6 + speed * 0.55);
      tx = p.x + dx * look + (tx - p.x) * (1 - Math.abs(dx));
      tz = p.z + dz * look + (tz - p.z) * (1 - Math.abs(dz));
    }
    for (let other of cars) {
      if (other === car) continue;
      let ox = other.body.position.x - p.x,
        oz = other.body.position.z - p.z,
        front = ox * forward.x + oz * forward.z,
        side = Math.abs(ox * forward.z - oz * forward.x);
      if (front > 0 && side < 2.25)
        desired = Math.min(desired, Math.sqrt(2 * Math.max(0, front - 6.5)));
    }
    for (let ped of people) {
      let pos = ped.model.g.position,
        ox = pos.x - p.x,
        oz = pos.z - p.z,
        front = ox * forward.x + oz * forward.z;
      if (
        ped.hp > 0 &&
        front > 0 &&
        Math.abs(ox * forward.z - oz * forward.x) < 1.75
      )
        desired = Math.min(desired, Math.sqrt(4 * Math.max(0, front - 3.6)));
    }
    let x = tx - p.x,
      z = tz - p.z,
      angle = Math.atan2(
        forward.x * z - forward.z * x,
        forward.x * x + forward.z * z,
      );
    car.drive(
      Math.min(0.8, Math.max(0, (desired - speed) * 0.46)),
      angle * 2.8,
      desired < 0.1 ? 1 : Math.min(1, Math.max(0, (speed - desired) * 1.5)),
      false,
    );
  }
}
