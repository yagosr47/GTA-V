import { Player } from "../entities/Player";
import { MissionSystem } from "../systems/MissionSystem";
import { WeaponSystem } from "../systems/WeaponSystem";
import { TrafficAndWantedSystem } from "../systems/TrafficAndWantedSystem";
import { TouchControls } from "./TouchControls";
const icon = (p: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${p}</svg>`;
const pad = icon(
  '<path d="M7 7h10c3 0 4 4 4.5 9 .3 3-2 4-4 2l-3-3h-5l-3 3c-2 2-4.5 1-4-2C3 11 4 7 7 7Z"/><path d="M6 11h5m-2.5-2.5v5m7-2h.1m2 2h.1"/>',
);
const pause = icon('<path d="M9 5v14m6-14v14" stroke-width="3"/>');
export class HUD {
  el = document.createElement("div");
  map: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  paused = false;
  get(id: string) {
    return this.el.querySelector<HTMLElement>("#" + id)!;
  }
  constructor(
    public tc: TouchControls,
    w: WeaponSystem,
  ) {
    this.el.className = "hud";
    document.body.append(this.el);
    this.el.innerHTML = `<header><div class="brand"><i class="sunbadge"></i><div><strong>NIGHTFALL<span> CITY</span></strong><small>OPEN WORLD SIMULATOR</small></div></div><div class="topright"><b class="live">● &nbsp; LIVE SESSION</b><button id="touchBtn" title="Controles táteis">${pad}</button><button id="pauseBtn" title="Pausar">${pause}</button></div></header><section class="mission"><small><em></em> MISSION FEED</small><h2 id="missionName"></h2><div id="objective"></div></section><div class="stats"><div class="stars" id="stars"></div><div class="money" id="money"></div></div><div class="reticle"></div><section class="nav"><div class="location"><i>⌖</i><div><small>LOS SANTOS &nbsp;/&nbsp; SECTOR 01</small><h2>Vespucci Blvd</h2></div></div><div class="radar"><canvas width="272" height="150"></canvas><b>N</b><span>GPS &nbsp;●</span></div><div class="vitals"><div>✚ <i><u id="hp"></u></i></div><div>⬟ <i><u id="armor"></u></i></div></div></section><section class="loadout"><small><em></em> EQUIPMENT &nbsp;/&nbsp; <b id="slot"></b></small><button id="gun" title="Trocar arma"><svg viewBox="0 0 90 45"><path fill="currentColor" d="M7 8h68v3h5v8H44l-4 10H29l-4 13-16-3 8-20H7z M32 20l-2 6h8l3-6z" fill-rule="evenodd"/><path stroke="#555063" stroke-width="2" d="M15 10l-2 7m7-7-2 7m7-7-2 7"/></svg><span><b id="weapon"></b><strong id="ammo"></strong></span></button></section><div class="prompt" id="prompt"></div><footer><span><i></i> FREEROAM <b>/</b> <label id="time"></label></span><div><kbd>W A S D</kbd> Mover &nbsp; <kbd>SHIFT</kbd> Correr &nbsp; <kbd>F</kbd> Interagir &nbsp; <kbd>?</kbd> Controles</div><span class="build">NF—OS <b>//</b> V.1.0</span></footer><dialog><small>SESSION MENU</small><h1>Jogo pausado</h1><p>WASD ou setas · Mover ou dirigir<br>Shift · Correr　 Espaço · Pular / drift<br>F · Entrar ou sair do veículo<br>Clique na cidade · Capturar mouse<br>Mouse esquerdo · Atirar　 Direito · Mirar<br>Q / scroll · Trocar arma　 R · Recarregar<br>Esc · Liberar mouse</p><button id="resume">Continuar partida →</button></dialog>`;
    this.map = this.el.querySelector("canvas")!;
    this.ctx = this.map.getContext("2d")!;
    this.get("touchBtn").onclick = () => tc.toggle();
    this.get("gun").onclick = () => w.swap();
    this.get("pauseBtn").onclick = this.get("resume").onclick = () =>
      this.toggle();
    this.el.querySelector("dialog")!.oncancel = (e) => {
      e.preventDefault();
      this.toggle();
    };
    addEventListener("keydown", (e) => {
      if (e.key === "?" || e.code === "KeyP") this.toggle();
    });
  }
  toggle() {
    this.paused = !this.paused;
    this.tc.i.paused = this.paused;
    this.tc.i.reset();
    let d = this.el.querySelector("dialog")!;
    if (this.paused) {
      document.exitPointerLock?.();
      d.showModal();
    } else d.close();
  }
  update(
    p: Player,
    m: MissionSystem,
    w: WeaponSystem,
    t: TrafficAndWantedSystem,
    yaw: number,
    clock: number,
    near: boolean,
  ) {
    let set = (id: string, s: string) => {
      let e = this.get(id);
      if (e.textContent !== s) e.textContent = s;
    };
    set("missionName", m.names[m.kind]);
    set(
      "objective",
      m.text + (m.active ? " · " + Math.ceil(m.time) + "s" : " ↗"),
    );
    set("stars", "★".repeat(t.stars) + "☆".repeat(5 - t.stars));
    set("money", "$ " + m.cash.toLocaleString("en-US"));
    set("weapon", p.car ? "Velocidade" : w.names[w.slot]);
    let ammo = this.get("ammo");
    ammo.innerHTML = p.car
      ? `${Math.round(p.car.body.velocity.length() * 3.6)} <i>KM/H</i>`
      : `${w.reload > 0 ? "··" : w.ammo[w.slot]} <i>/ ${w.stock[w.slot]}</i>`;
    set("slot", "0" + (w.slot + 1));
    this.get("hp").style.width = p.health + "%";
    this.get("armor").style.width = p.armor + "%";
    set(
      "time",
      `${String(Math.floor(clock / 60) % 24).padStart(2, "0")}:${String(Math.floor(clock) % 60).padStart(2, "0")}`,
    );
    let pr = this.get("prompt");
    pr.innerHTML = p.car
      ? "<kbd>F</kbd> Sair do veículo"
      : near
        ? "<kbd>F</kbd> Entrar no veículo"
        : "";
    pr.hidden = !pr.innerHTML || this.tc.enabled;
    let c = this.ctx;
    c.fillStyle = "#1c1c2d";
    c.fillRect(0, 0, 272, 150);
    c.save();
    c.translate(136, 80);
    c.rotate(yaw);
    c.scale(1.55, 1.55);
    c.translate(-p.pos.x, -p.pos.z);
    for (let x = -4; x < 4; x++)
      for (let z = -4; z < 4; z++) {
        c.fillStyle = "#4c485b";
        c.fillRect(x * 52 + 8.5, z * 52 + 8.5, 35, 35);
        c.strokeStyle = "#797083";
        c.lineWidth = 0.6;
        c.strokeRect(x * 52 + 8.5, z * 52 + 8.5, 35, 35);
        c.fillStyle = "#373545";
        for (let dx of [11, 28])
          for (let dz of [11, 28]) {
            const park =
              dx === 11 &&
              dz === 11 &&
              ((x === 0 && z === 0) || (x === -1 && z === -2));
            c.fillStyle = park ? "#426759" : "#373545";
            c.fillRect(x * 52 + dx, z * 52 + dz, 13, 13);
          }
      }
    for (const v of t.cars) {
      if (v === p.car) continue;
      c.fillStyle = v.police ? "#86aecb" : "#b09aaf";
      c.beginPath();
      c.arc(v.body.position.x, v.body.position.z, 1.55, 0, Math.PI * 2);
      c.fill();
    }
    let [x, z] = m.target;
    c.strokeStyle = "#f7ab66";
    c.lineWidth = 2;
    c.setLineDash([3, 2]);
    c.beginPath();
    c.moveTo(p.pos.x, p.pos.z);
    c.lineTo(0, p.pos.z);
    c.lineTo(0, z);
    c.lineTo(x, z);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = "#ffc677";
    c.fillRect(x - 2, z - 2, 4, 4);
    c.restore();
    c.fillStyle = "#6dfbea";
    c.beginPath();
    c.moveTo(136, 70);
    c.lineTo(143, 85);
    c.lineTo(136, 82);
    c.lineTo(129, 85);
    c.closePath();
    c.fill();
  }
}
