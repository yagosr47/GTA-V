import assert from "node:assert/strict";
import { createServer } from "vite";
import * as C from "cannon-es";
import * as T from "three";
// Texture painting is irrelevant to physics. The real scene graph, city generator,
// pedestrian navigation, controller and Cannon contact solver run below.
const ctx = new Proxy(
  { createLinearGradient: () => ({ addColorStop() {} }) },
  { get: (o, k) => o[k] ?? (() => {}) },
);
globalThis.document = {
  createElement: () => {
    const canvas = { width: 0, height: 0, getContext: () => ctx };
    ctx.canvas = canvas;
    return canvas;
  },
};
const vite = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { CityGenerator } = await vite.ssrLoadModule(
    "/src/world/CityGenerator.ts",
  );
  const { Player } = await vite.ssrLoadModule("/src/entities/Player.ts");
  const { NPC } = await vite.ssrLoadModule("/src/entities/NPC.ts");
  const { inLot } = await vite.ssrLoadModule("/src/world/StreetLayout.ts");
  const scene = new T.Scene(),
    world = new C.World({ gravity: new C.Vec3(0, -18, 0), allowSleep: true }),
    city = new CityGenerator(scene, world);
  for (const b of world.bodies.filter((b) => b.position.y >= 0)) {
    let h = b.shapes[0].halfExtents;
    assert(inLot(b.position.x, b.position.z, 2 * h.x, 2 * h.z));
  }
  const p = new Player(world, scene);
  const { CameraController } = await vite.ssrLoadModule(
    "/src/core/CameraController.ts",
  );
  const orbit = new CameraController(),
    input = { dx: 0, dy: 0, keys: new Set() };
  for (const aspect of [16 / 9, 9 / 16]) {
    orbit.cam.aspect = aspect;
    for (const [dx, dy] of [
      [450, 900],
      [-800, -1200],
      [400, 1000],
    ]) {
      input.dx = dx;
      input.dy = dy;
      for (let frame = 0; frame < 55; frame++) {
        orbit.update(p, input, city.solid, 1 / 60);
        orbit.cam.updateMatrixWorld();
        const pivot = new T.Vector3(p.pos.x, p.pos.y + 0.81, p.pos.z).project(
          orbit.cam,
        );
        assert(
          Math.hypot(pivot.x, pivot.y) < 1e-6,
          "orbit must keep the torso centered at every pitch",
        );
        assert(
          orbit.cam.position.y >= 0.299,
          "camera must stay above pavement",
        );
      }
    }
  }
  function ticks(n, x, z, jump = false) {
    for (let i = 0; i < n; i++) {
      p.move(x, z, 0, jump && i === 0, false, 1 / 60);
      world.step(1 / 60);
    }
  }
  ticks(240, 0, 0);
  let start = p.pos.z;
  ticks(60, 0, 1);
  assert(start - p.pos.z > 2, "must walk after standing idle");
  let x = p.pos.x;
  ticks(60, 1, 0);
  assert(p.pos.x > x + 2, "must strafe");
  let y = p.pos.y;
  ticks(8, 0, 0, true);
  assert(p.pos.y > y + 0.35, "must jump");
  for (const [k, neighbours] of city.walk)
    for (const n of neighbours)
      assert(
        city.walk.get(n)?.includes(k),
        "sidewalk edges must connect both ends",
      );
  const node = "9.45,9.45",
    ped = new NPC(scene, city.walk, false, node);
  ped.next = "-9.45,9.45";
  const car = {
    body: { position: new C.Vec3(0, 1, 9.45), velocity: new C.Vec3() },
  };
  ped.step(p, 0, 1 / 60, city.solid, [car]);
  assert.equal(ped.state, "yield");
  assert.equal(ped.model.g.position.x, 9.45);
  ped.step(p, 0, 1 / 60, city.solid, []);
  assert(ped.model.g.position.x < 9.45);
  ped.step(p, 1, 1 / 60, city.solid, []);
  assert.equal(ped.state, "panic");
  const { LaneDriver } = await vite.ssrLoadModule("/src/systems/LaneDriver.ts");
  const { Vehicle } = await vite.ssrLoadModule("/src/entities/Vehicle.ts");
  const { vitality } = await vite.ssrLoadModule("/src/entities/Vitality.ts");
  for (const [level, values] of [
    [0, [100]],
    [1, [99, 80]],
    [2, [79, 60]],
    [3, [59, 40]],
    [4, [39, 20]],
    [5, [19, 1]],
    [6, [0]],
  ])
    for (const v of values) assert.equal(vitality(v).level, level);
  const laneWorld = new C.World({
      allowSleep: true,
      gravity: new C.Vec3(0, -18, 0),
    }),
    floor = new C.Body({ shape: new C.Box(new C.Vec3(160, 1, 160)) });
  floor.position.y = -1;
  laneWorld.addBody(floor);
  const vehicle = new Vehicle(laneWorld, scene, 0, 0, "#d86");
  const driver = new LaneDriver(
      [
        [0, 52],
        [0, 0],
        [52, 0],
        [52, 52],
      ],
      vehicle,
    ),
    locks = new Map();
  const drive = (frames, clock, peds = []) => {
    for (let f = 0; f < frames; f++) {
      driver.step(1 / 60, clock, [vehicle], peds, locks);
      laneWorld.step(1 / 60);
    }
  };
  drive(480, 12);
  assert(
    vehicle.body.position.z > 12 && vehicle.body.position.z < 16,
    "red: stop before crossing",
  );
  assert(vehicle.body.velocity.length() < 0.4);
  assert(Math.abs(vehicle.body.position.x - 3.5) < 0.5, "right-hand lane");
  ped.reset("9.45,9.45");
  ped.next = "-9.45,9.45";
  ped.crossing = true;
  drive(150, 2, [ped]);
  assert(
    vehicle.body.position.z > 12,
    "green still yields to waiting pedestrian",
  );
  const leader = new Vehicle(laneWorld, scene, 3.5, 9, "#458");
  leader.drive(0, 0, 1, false);
  for (let i = 0; i < 180; i++) {
    driver.step(1 / 60, 2, [vehicle, leader], [], locks);
    laneWorld.step(1 / 60);
    assert(
      vehicle.body.position.distanceTo(leader.body.position) > 4.8,
      "following distance prevents rear-end contact",
    );
  }
  leader.body.position.set(90, 1, 90);
  leader.body.aabbNeedsUpdate = true;
  drive(660, 2);
  assert(driver.index !== 1, "clear crossing releases traffic");
  const pos = vehicle.body.position;
  ped.model.g.position.set(pos.x, 0.24, pos.z);
  vehicle.body.velocity.set(6, 0, 0);
  assert(ped.impact(vehicle, laneWorld, true));
  assert(!ped.impact(vehicle, laneWorld, true));
  assert.equal(ped.hp, 67);
  ped.hurt(200, true);
  assert.equal(ped.hp, 0);
  assert(ped.playerKill);
  const { MissionSystem } = await vite.ssrLoadModule(
    "/src/systems/MissionSystem.ts",
  );
  const mission = new MissionSystem(scene);
  mission.index = 1;
  p.body.position.set(3, 1, -45);
  mission.step(p, [], 1 / 60);
  assert(!mission.active, "no target must not start a broken mission");
  ped.reset(node);
  p.body.position.x = 12;
  mission.step(p, [ped], 5);
  p.body.position.x = 3;
  mission.step(p, [ped], 1 / 60);
  assert(ped.pinned);
  ped.hurt(100, true);
  mission.step(p, [ped], 1 / 60);
  assert.equal(mission.cash, 2950);
  assert(!ped.pinned);
  mission.step(p, [ped], 5);
  assert(!mission.active, "must exit trigger to restart");
  assert.equal(mission.cash, 2950);
  const race = new MissionSystem(scene);
  race.index = 2;
  race.step(p, [], 1 / 60);
  assert(race.active);
  p.enter(vehicle);
  for (let n = 0; n < 3; n++) {
    let [x, z] = race.target;
    vehicle.body.position.set(x, 1, z);
    race.step(p, [], 1 / 60);
  }
  assert.equal(race.cash, 2950);
  assert(!race.active);
  p.exit();
  const timed = new MissionSystem(scene);
  p.body.position.set(3, 1, -45);
  timed.step(p, [], 1 / 60);
  timed.step(p, [], 91);
  assert(!timed.active);
  assert.equal(timed.cash, 2450);
  console.log(
    "OK: lane driving, traffic priority, health bands, impacts, mission lifecycle, centered high/low orbit (landscape and portrait), idle → walking, strafing, jumping, road clearance, sidewalk links, yielding and panic",
  );
} finally {
  await vite.close();
}
