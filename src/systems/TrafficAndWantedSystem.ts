import * as T from "three";
import { Vec3 } from "cannon-es";
import { Vehicle } from "../entities/Vehicle";
import { NPC } from "../entities/NPC";
import { CityGenerator } from "../world/CityGenerator";
import { Player } from "../entities/Player";
import { rand } from "../utils/TextureGenerator";
export class TrafficAndWantedSystem {
  cars: Vehicle[] = [];
  people: NPC[] = [];
  heat = 0;
  timer = 0;
  targets = new Map<Vehicle, string>();
  get stars() {
    return Math.ceil(this.heat);
  }
  crime() {
    this.heat = Math.min(5, this.heat + 0.45);
    this.timer = 24;
  }
  constructor(
    public city: CityGenerator,
    mobile: boolean,
  ) {
    let keys = [...city.walk.keys()].sort((a, b) => {
      let d = (k: string) => Math.hypot(...k.split(",").map(Number));
      return d(a) - d(b);
    });
    for (let n = 0; n < (mobile ? 14 : 30); n++)
      this.people.push(new NPC(city.s, city.walk, n % 8 === 5, keys[n]));
    for (let [x, z, col, cop] of [
      [2.5, 15, "#ab385e", false],
      [-4, -22, "#43798b", false],
      [4, -59, "#c67d49", false],
      [-49, -5, "#37475a", true],
      [55, 4, "#79546e", false],
      [-4, 75, "#43778a", false],
    ] as const) {
      let v = new Vehicle(city.world, city.s, x, z, col, cop);
      this.cars.push(v);
      this.targets.set(
        v,
        `${Math.round(x / 52) * 52},${Math.round(z / 52) * 52}`,
      );
    }
  }
  step(p: Player, dt: number) {
    this.timer -= dt;
    if (this.timer < 0) this.heat = Math.max(0, this.heat - dt * 0.09);
    for (let n of this.people) {
      let pos = n.model.g.position;
      if (Math.hypot(pos.x - p.pos.x, pos.z - p.pos.z) > 115) {
        let keys = [...this.city.walk.keys()].filter((k) => {
          let [x, z] = k.split(",").map(Number);
          let d = Math.hypot(x - p.pos.x, z - p.pos.z);
          return d > 45 && d < 90;
        });
        if (keys.length) {
          n.node = n.next = keys[Math.floor(rand() * keys.length)];
          let [x, z] = n.node.split(",").map(Number);
          pos.set(x, 0.25, z);
          n.hp = 60;
        }
      }
      n.step(p, this.stars, dt, this.city.solid);
    }
    for (let car of this.cars) {
      car.alert = car.police && this.stars > 0;
      if (car === p.car || car === this.cars[0]) continue;
      let key = this.targets.get(car)!,
        [x, z] = key.split(",").map(Number),
        pos = car.body.position;
      if (pos.distanceTo(p.pos) > 140) {
        let options = [...this.city.roads.keys()].filter((k) => {
          let [u, v] = k.split(",").map(Number),
            d = Math.hypot(u - p.pos.x, v - p.pos.z);
          return d > 55 && d < 95;
        });
        if (options.length) {
          key = options[Math.floor(rand() * options.length)];
          [x, z] = key.split(",").map(Number);
          pos.set(x + 3, 1, z);
          car.body.velocity.setZero();
          car.body.angularVelocity.setZero();
          car.body.quaternion.set(0, 0, 0, 1);
          car.body.wakeUp();
          car.body.aabbNeedsUpdate = true;
          car.hp = 100;
          car.burned = false;
          this.targets.set(car, key);
        }
      }
      if (Math.hypot(x - pos.x, z - pos.z) < 6) {
        let opts = this.city.roads.get(key);
        if (opts) this.targets.set(car, opts[Math.floor(rand() * opts.length)]);
      }
      if (car.police && this.stars) {
        x = p.pos.x;
        z = p.pos.z;
      }
      let f = car.body.vectorToWorldFrame(new Vec3(0, 0, -1)),
        angle = Math.atan2(
          f.z * (x - pos.x) - f.x * (z - pos.z),
          f.x * (x - pos.x) + f.z * (z - pos.z),
        );
      let sensor = new T.Raycaster(
        new T.Vector3(pos.x, pos.y, pos.z),
        new T.Vector3(f.x, 0, f.z).normalize(),
        0,
        6,
      );
      let stop =
        sensor.intersectObjects(this.city.solid, false).length > 0 ||
        this.cars.some(
          (v) =>
            v !== car &&
            v.body.position.distanceTo(pos) < 6 &&
            v.body.position.vsub(pos).dot(f) > 0,
        );
      car.drive(
        stop ? 0 : car.body.velocity.length() < 7 ? 0.45 : 0,
        -angle,
        stop ? 1 : 0,
        false,
      );
    }
  }
}
