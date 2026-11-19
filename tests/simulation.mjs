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
  console.log(
    "OK: centered high/low orbit (landscape and portrait), idle → walking, strafing, jumping, road clearance, sidewalk links, yielding and panic",
  );
} finally {
  await vite.close();
}
