import * as T from "three";
import * as C from "cannon-es";
import { box, mat, lit } from "../utils/TextureGenerator";
import { shell, glazing, alloy } from "./Coachwork";
export class Vehicle {
  g = new T.Group();
  body: C.Body;
  r: C.RaycastVehicle;
  wheels: T.Mesh[] = [];
  hp = 100;
  burned = false;
  alert = false;
  beacons: T.Mesh[] = [];
  puffs: T.Mesh[] = [];
  steer = 0;
  smoke: T.Mesh;
  constructor(
    world: C.World,
    s: T.Scene,
    x: number,
    z: number,
    color: string,
    public police = false,
  ) {
    this.body = new C.Body({
      mass: 1050,
      shape: new C.Box(new C.Vec3(1, 0.35, 2.18)),
      position: new C.Vec3(x, 1, z),
    });
    this.r = new C.RaycastVehicle({
      chassisBody: this.body,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });
    const paint = new T.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.29,
        flatShading: true,
      }),
      trim = mat("#221f2b");
    const sedan = police || x < 0,
      roof = sedan ? 1.07 : 0.91;
    shell(
      this.g,
      [
        [-2.34, 0.91, -0.14, 0.13, 0.92],
        [-1.66, 1.07, -0.21, 0.31, 1.01],
        [-0.65, 1.1, -0.19, 0.39, 1.03],
        [1.42, 1.1, -0.19, 0.39, 1.04],
        [2.33, 1, -0.16, 0.27, 0.99],
      ],
      paint,
    );
    shell(
      this.g,
      [
        [-1.04, 0.98, 0.33, 0.36, 0.94],
        [-0.37, 0.97, 0.36, roof, 0.72],
        [sedan ? 0.89 : 0.66, 0.98, 0.36, roof, 0.73],
        [1.49, 1, 0.33, 0.37, 0.95],
      ],
      glazing(),
    );
    box(
      this.g,
      0,
      roof + 0.014,
      sedan ? 0.26 : 0.15,
      1.48,
      0.065,
      sedan ? 1.29 : 1.08,
      paint,
    );
    box(this.g, 0, -0.14, 2.32, 2.01, 0.14, 0.12, trim);
    box(this.g, 0, 0.155, 2.327, 1.89, 0.14, 0.045, trim);
    for (let side of [-1, 1]) {
      box(this.g, side * 0.71, -0.21, 2.32, 0.28, 0.1, 0.19, mat("#b2a4a6"));
      let pillar = box(
        this.g,
        side * 0.85,
        (roof + 0.36) / 2,
        0.24,
        0.065,
        roof - 0.29,
        0.085,
        paint,
      );
      pillar.rotation.z = side * 0.36;
      box(this.g, side * 1.065, -0.135, 0.02, 0.11, 0.12, 3.6, paint);
      if (police)
        box(this.g, side * 1.078, 0.025, 0.03, 0.04, 0.27, 1.7, mat("#ded9d0"));
    }
    box(this.g, 0, 0.04, 2.351, 0.49, 0.15, 0.03, lit("#f4ca91"));
    box(this.g, 0, 0.34, 1.65, 1.79, 0.025, 0.59, trim);
    box(this.g, 0, 0.5, 2, 2.15, 0.1, 0.35, paint);
    for (let a of [-1, 1]) {
      box(this.g, a * 0.69, 0.39, 2, 0.12, 0.25, 0.14, trim);
      box(this.g, a * 1.095, 0.02, 0.1, 0.04, 0.06, 3.88, trim);
      box(this.g, a * 1.096, 0.23, 0.5, 0.05, 0.055, 0.2, trim);
      box(this.g, a * 0.79, 0.09, 2.34, 0.5, 0.16, 0.04, lit("#ff335e"));
      box(this.g, a * 0.75, 0.12, -2.34, 0.57, 0.15, 0.04, lit("#fff4c8"));
      box(this.g, a * 1.14, 0.48, -0.6, 0.24, 0.15, 0.26, paint);
      for (let b of [-1, 1]) {
        this.r.addWheel({
          radius: 0.39,
          chassisConnectionPointLocal: new C.Vec3(a * 1, -0.13, b * 1.47),
          directionLocal: new C.Vec3(0, -1, 0),
          axleLocal: new C.Vec3(-1, 0, 0),
          suspensionStiffness: 36,
          suspensionRestLength: 0.3,
          dampingRelaxation: 2.5,
          dampingCompression: 4.5,
          frictionSlip: 4,
          rollInfluence: 0.04,
        });
        let geo = new T.CylinderGeometry(0.39, 0.39, 0.28, 24);
        geo.rotateZ(Math.PI / 2);
        let wh = new T.Mesh(geo, [trim, alloy(), alloy()]);
        this.wheels.push(wh);
        s.add(wh);
      }
    }
    if (police) {
      this.beacons.push(
        box(this.g, -0.3, 1.12, 0, 0.48, 0.17, 0.25, lit("#ff3875")),
      );
      this.beacons.push(
        box(this.g, 0.3, 1.12, 0, 0.48, 0.17, 0.25, lit("#368dff")),
      );
    }
    this.smoke = new T.Mesh(new T.IcosahedronGeometry(0.45), mat("#595469"));
    this.g.add(this.smoke);
    for (let i = 0; i < 6; i++) {
      let puff = this.smoke.clone();
      this.puffs.push(puff);
      this.g.add(puff);
    }
    this.r.addToWorld(world);
    s.add(this.g);
    this.body.addEventListener(
      "collide",
      (e: { contact: C.ContactEquation }) =>
        (this.hp = Math.max(
          0,
          this.hp -
            Math.max(
              0,
              Math.abs(e.contact.getImpactVelocityAlongNormal()) - 9,
            ) *
              2,
        )),
    );
  }
  drive(t: number, s: number, b: number, drift: boolean) {
    this.steer += (T.MathUtils.clamp(s, -1, 1) * 0.49 - this.steer) * 0.12;
    for (let i = 0; i < 4; i++) {
      this.r.setSteeringValue(i % 2 === 0 ? -this.steer : 0, i);
      this.r.applyEngineForce(this.hp > 0 ? t * 1700 : 0, i);
      this.r.setBrake(drift && i % 2 ? 28 : b * 9, i);
      this.r.wheelInfos[i].frictionSlip = drift && i % 2 ? 1 : 4;
    }
  }
  sync(time: number) {
    this.g.position.copy(this.body.position);
    this.g.quaternion.copy(this.body.quaternion);
    this.wheels.forEach((w, i) => {
      this.r.updateWheelTransform(i);
      let t = this.r.wheelInfos[i].worldTransform;
      w.position.copy(t.position);
      w.quaternion.copy(t.quaternion);
    });
    this.beacons.forEach(
      (b, i) => (b.visible = !this.alert || Math.floor(time * 5) % 2 === i),
    );
    this.puffs.forEach((s, i) => {
      s.visible = this.hp < 45;
      if (!s.visible) return;
      let phase = (time * 0.7 + i / 6) % 1;
      s.position.set(0.3 + phase * 0.58, 1 + phase * 2.1, -1.4 + phase * 0.54);
      s.rotation.y = time + i;
      s.scale.setScalar(Math.sin(Math.PI * phase) * (0.3 + phase));
    });
    this.smoke.visible = this.hp < 45;
    this.smoke.position.set(0.3, 1 + (time % 1.4), -1.4);
    this.smoke.scale.setScalar(0.4 + (time % 1.4));
  }
}
