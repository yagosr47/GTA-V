import { LaneDriver } from "./LaneDriver";
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
  drivers: LaneDriver[] = [];
  locks = new Map<string, LaneDriver>();
  time = 0;
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
      [6.75, 15, "#ab385e", false],
      [-4, -22, "#43798b", false],
      [4, -59, "#c67d49", false],
      [-49, -5, "#37475a", true],
      [55, 4, "#79546e", false],
      [-4, 75, "#43778a", false],
    ] as const) {
      let v = new Vehicle(city.world, city.s, x, z, col, cop);
      this.cars.push(v);
      const routes: [number, number][][] = [
        [
          [0, 0],
          [0, -52],
          [52, -52],
          [52, 0],
        ],
        [
          [0, -52],
          [0, 0],
          [-52, 0],
          [-52, -52],
        ],
        [
          [-52, 0],
          [0, 0],
          [0, -52],
          [-52, -52],
        ],
        [
          [52, 0],
          [52, 52],
          [0, 52],
          [0, 0],
        ],
        [
          [0, 52],
          [0, 0],
          [52, 0],
          [52, 52],
        ],
      ];
      if (this.cars.length > 1)
        this.drivers.push(
          new LaneDriver(routes[this.cars.length - 2], v, city.roads),
        );
    }
  }
  step(p: Player, dt: number) {
    this.time += dt;
    this.city.signs.update(this.time);
    this.timer -= dt;
    if (this.timer < 0) this.heat = Math.max(0, this.heat - dt * 0.09);
    for (let n of this.people) {
      let pos = n.model.g.position;
      if (!n.pinned && Math.hypot(pos.x - p.pos.x, pos.z - p.pos.z) > 115) {
        let keys = [...this.city.walk.keys()].filter((k) => {
          let [x, z] = k.split(",").map(Number);
          let d = Math.hypot(x - p.pos.x, z - p.pos.z);
          return d > 45 && d < 90;
        });
        if (keys.length) {
          n.reset(keys[Math.floor(rand() * keys.length)]);
        }
      }
      for (const car of this.cars)
        if (n.impact(car, this.city.world, car === p.car) && car === p.car)
          this.crime();
      n.step(p, this.stars, dt, this.city.solid, this.cars);
    }
    for (const [index, driver] of this.drivers.entries()) {
      const car = driver.car;
      car.alert = car.police && this.stars > 0;
      if (car === p.car || car.hp <= 0) {
        driver.retired = true;
        driver.release(this.locks);
      }
      if (driver.retired) continue;
      // Reuse distant traffic only on a free, directed approach, never at the intersection centre.
      if (car.body.position.distanceTo(p.pos) > 145) {
        const routes: [number, number][][] = [];
        for (const [key, adj] of this.city.roads) {
          const a = key.split(",").map(Number) as [number, number];
          for (const k of adj) {
            const b = k.split(",").map(Number) as [number, number],
              x = (a[0] + b[0]) / 2 - ((b[1] - a[1]) / 52) * 3.5,
              z = (a[1] + b[1]) / 2 + ((b[0] - a[0]) / 52) * 3.5,
              d = Math.hypot(x - p.pos.x, z - p.pos.z);
            if (
              d < 65 ||
              d > 90 ||
              this.cars.some(
                (v) =>
                  Math.hypot(v.body.position.x - x, v.body.position.z - z) < 12,
              ) ||
              this.people.some(
                (n) =>
                  Math.hypot(
                    n.model.g.position.x - x,
                    n.model.g.position.z - z,
                  ) < 6,
              )
            )
              continue;
            let next = this.city.roads.get(k)!.find((v) => v !== key)!;
            routes.push([
              a,
              b,
              next.split(",").map(Number) as [number, number],
            ]);
          }
        }
        if (routes.length) {
          driver.release(this.locks);
          car.body.velocity.setZero();
          car.body.angularVelocity.setZero();
          this.drivers[index] = new LaneDriver(
            routes[Math.floor(rand() * routes.length)],
            car,
            this.city.roads,
          );
          car.body.aabbNeedsUpdate = true;
          car.body.wakeUp();
          continue;
        }
      }

      driver.step(
        dt,
        this.time,
        this.cars,
        this.people,
        this.locks,
        car.alert ? [p.pos.x, p.pos.z] : undefined,
      );
    }
  }
}
