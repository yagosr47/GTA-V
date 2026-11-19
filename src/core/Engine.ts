import * as T from "three";
import * as C from "cannon-es";
import { InputManager } from "./InputManager";
import { CameraController } from "./CameraController";
import { Player } from "../entities/Player";
import { CityGenerator } from "../world/CityGenerator";
import { WeaponSystem } from "../systems/WeaponSystem";
import { TrafficAndWantedSystem } from "../systems/TrafficAndWantedSystem";
import { MissionSystem } from "../systems/MissionSystem";
import { HUD } from "../ui/HUD";
import { TouchControls } from "../ui/TouchControls";
import { SoundFX } from "../utils/SoundFX";
export class Engine {
  scene = new T.Scene();
  world = new C.World({ gravity: new C.Vec3(0, -18, 0), allowSleep: true });
  cam = new CameraController();
  renderer: T.WebGLRenderer;
  sun = new T.DirectionalLight("#ffc59c", 2);
  city: CityGenerator;
  p: Player;
  input: InputManager;
  traffic: TrafficAndWantedSystem;
  missions: MissionSystem;
  weapon = new WeaponSystem();
  audio = new SoundFX();
  tc: TouchControls;
  hud: HUD;
  mobile = matchMedia("(pointer:coarse)").matches;
  acc = 0;
  time = 0;
  last = 0;
  avg = 0.016;
  frames = 0;
  ratio = Math.min(devicePixelRatio, this.mobile ? 1.5 : 2);
  near = false;
  constructor(root: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    root.append(this.renderer.domElement);
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.scene.fog = new T.FogExp2("#db99a3", 0.006);
    this.scene.add(
      new T.HemisphereLight("#ffcfe8", "#ac93ab", 1.9),
      this.sun,
      this.sun.target,
    );
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(this.mobile ? 512 : 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -36,
      right: 36,
      top: 36,
      bottom: -36,
      far: 180,
    });
    this.sun.shadow.bias = -0.0008;
    this.world.broadphase = new C.SAPBroadphase(this.world);
    this.city = new CityGenerator(this.scene, this.world);
    this.input = new InputManager(this.renderer.domElement);
    this.p = new Player(this.world, this.scene);
    this.traffic = new TrafficAndWantedSystem(this.city, this.mobile);
    this.missions = new MissionSystem(this.scene);
    this.tc = new TouchControls(this.input);
    this.hud = new HUD(this.tc, this.weapon);
    onresize = () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.cam.cam.aspect = innerWidth / innerHeight;
      this.cam.cam.updateProjectionMatrix();
    };
    window.dispatchEvent(new Event("resize"));
    document.addEventListener("visibilitychange", () => {
      this.last = 0;
      this.acc = 0;
      this.input.reset();
      this.audio.rpm(0, false);
    });
    requestAnimationFrame(this.frame);
  }
  step(dt: number) {
    let p = this.p,
      i = this.input;
    this.time += dt;
    let nearest = this.traffic.cars.reduce((a, b) =>
      a.body.position.distanceTo(p.pos) < b.body.position.distanceTo(p.pos)
        ? a
        : b,
    );
    this.near = nearest.body.position.distanceTo(p.pos) < 6.8;
    if (i.interact) {
      if (p.car) p.exit();
      else if (this.near) p.enter(nearest);
    }
    if (p.car) {
      let brake =
        i.vehicleBrake > 0 &&
        p.car.body.vectorToLocalFrame(p.car.body.velocity).z < -0.8;
      p.car.drive(
        brake ? 0 : i.vehicleThrottle - i.vehicleBrake,
        i.vehicleSteer,
        brake ? i.vehicleBrake : 0,
        i.handbrake,
      );
    } else {
      let len = Math.max(1, Math.hypot(i.x, i.z));
      p.move(i.x / len, i.z / len, this.cam.yaw, i.jump, i.sprint, dt);
      this.weapon.step(dt, i, this.cam, this.traffic, this.audio);
    }
    this.traffic.step(p, dt);
    for (let v of this.traffic.cars) {
      if (v.hp <= 0 && !v.burned) {
        v.burned = true;
        if (v.body.position.distanceTo(p.pos) < 50)
          this.audio.pulse(true, 340, 0.72);
      }
    }
    this.world.step(dt);

    if (
      p.health <= 0 ||
      p.pos.y < -8 ||
      Math.abs(p.pos.x) > 222 ||
      Math.abs(p.pos.z) > 222
    ) {
      if (this.missions.active)
        this.missions.cancel("Missão interrompida · volte ao início");
      if (p.car) p.exit();
      p.body.position.set(3, 1, 20);
      p.body.velocity.setZero();
      p.health = 100;
      p.armor = 75;
      this.traffic.heat = 0;
    } else this.missions.step(p, this.traffic.people, dt);
    if (
      this.traffic.stars &&
      Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)
    )
      this.audio.pulse(false, Math.floor(this.time * 2) % 2 ? 640 : 820);
  }
  frame = (now: number) => {
    requestAnimationFrame(this.frame);
    let dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    if (this.hud.paused || document.hidden) {
      this.audio.rpm(0, false);
      return;
    }
    this.acc += dt;
    while (this.acc >= 1 / 60) {
      this.step(1 / 60);
      this.acc -= 1 / 60;
    }
    this.p.sync();
    this.p.pose(
      this.input.keys.has("Aim") || this.input.keys.has("Fire"),
      this.cam.yaw,
      this.weapon.slot,
    );
    this.traffic.cars.forEach((v) => v.sync(this.time));
    this.city.sky.position.set(this.p.pos.x, 0, this.p.pos.z);
    this.cam.update(this.p, this.input, this.city.solid, dt);
    let p = this.p.pos;
    this.sun.position.set(
      p.x - 35,
      p.y + 48 + 8 * Math.cos(this.time / 240),
      p.z - 40,
    );
    this.sun.target.position.set(p.x, p.y, p.z);
    let phase = this.time / 540,
      day = (1 + Math.cos(phase)) / 2;
    this.sun.intensity = 0.35 + day * 1.75;
    this.sun.color.setHSL(0.04 + 0.045 * day, 0.62, 0.67 + 0.14 * day);
    this.city.sky.material.uniforms.low.value.setHSL(
      0.71 - 0.65 * day,
      0.35 + 0.45 * day,
      0.12 + 0.61 * day,
    );
    this.city.sky.material.uniforms.top.value.setHSL(
      0.69,
      0.39,
      0.09 + 0.23 * day,
    );
    this.city.sun.position.y = 45 * Math.cos(phase);
    this.audio.rpm(this.p.car?.body.velocity.length() ?? 0, !!this.p.car);
    this.tc.update(!!this.p.car, this.near);
    if (this.frames % 5 === 0)
      this.hud.update(
        this.p,
        this.missions,
        this.weapon,
        this.traffic,
        this.cam.yaw,
        18 * 60 + 42 + this.time * 0.2,
        this.near,
      );
    this.avg = this.avg * 0.96 + dt * 0.04;
    if (++this.frames % 120 === 0) {
      let max = Math.min(devicePixelRatio, this.mobile ? 1.5 : 2);
      this.ratio = T.MathUtils.clamp(
        this.ratio + (this.avg > 0.022 ? -0.15 : this.avg < 0.017 ? 0.08 : 0),
        0.65,
        max,
      );
      this.renderer.setPixelRatio(this.ratio);
      this.cam.cam.far = this.ratio < 0.85 ? 460 : 700;
      this.sun.castShadow = this.ratio > 0.7;
    }
    this.renderer.render(this.scene, this.cam.cam);
  };
}
