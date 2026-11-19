import * as T from "three";
import { NPC } from "../entities/NPC";
import { Player } from "../entities/Player";
export class MissionSystem {
  index = 0;
  cash = 2450;
  active = false;
  time = 0;
  stage = 0;
  marked?: NPC;
  private armed = true;
  private message = "";
  private notice = 0;
  cancel(reason: string) {
    if (this.marked) this.marked.pinned = false;
    this.marked = undefined;
    this.active = false;
    this.time = 0;
    this.armed = false;
    this.message = reason;
    this.notice = 4;
  }
  ring: T.Mesh;
  names = ["Entrega expressa", "Patrulha noturna", "Circuito neon"];
  points = [
    [3, -45],
    [52, -52],
    [-52, -52],
    [0, 52],
  ];
  constructor(s: T.Scene) {
    try {
      let d = JSON.parse(localStorage.nightfall || "{}");
      if (
        Number.isInteger(d.index) &&
        d.index >= 0 &&
        Number.isFinite(d.cash)
      ) {
        this.index = d.index;
        this.cash = d.cash;
      }
    } catch {}
    this.ring = new T.Mesh(
      new T.TorusGeometry(2, 0.09, 8, 40),
      new T.MeshBasicMaterial({ color: "#ffce69" }),
    );
    this.ring.rotation.x = Math.PI / 2;
    s.add(this.ring);
  }
  get kind() {
    return this.index % 3;
  }
  get target() {
    if (this.active && this.kind === 1 && this.marked) {
      let p = this.marked.model.g.position;
      return [p.x, p.z];
    }
    return this.points[this.active ? (this.stage + 1) % 4 : 0];
  }
  get text() {
    if (!this.active && this.notice > 0) return this.message;
    return !this.active
      ? "Encontre o ponto de partida"
      : this.kind === 1
        ? "Neutralize o alvo marcado"
        : !this.carried
          ? "Entre em um veículo"
          : this.kind === 2
            ? `Checkpoint ${this.stage + 1} / 3`
            : "Chegue ao destino";
  }
  carried = false;
  step(p: Player, people: NPC[], dt: number) {
    this.notice -= dt;
    this.carried = !!p.car;
    let [x, z] = this.target;
    this.ring.position.set(x, 0.12, z);
    let near = Math.hypot(p.pos.x - x, p.pos.z - z) < 4;
    if (!this.active) {
      if (!near) this.armed = true;
      if (near && this.armed && this.notice <= 0) {
        this.active = true;
        this.time = 90;
        if (this.kind === 1)
          this.marked = people
            .filter((n) => !n.cop && n.hp > 0)
            .sort(
              (a, b) =>
                a.model.g.position.distanceTo(this.ring.position) -
                b.model.g.position.distanceTo(this.ring.position),
            )[0];
        if (this.kind === 1 && !this.marked) {
          this.cancel("Sem alvo disponível · retorne depois");
          return;
        }
        if (this.marked) this.marked.pinned = true;
        this.stage = 0;
      }
      return;
    }
    this.time -= dt;
    if (this.time <= 0) {
      this.cancel("Tempo esgotado · volte ao início");
      return;
    }
    if (this.kind === 1 && this.marked?.hp === 0 && !this.marked.playerKill) {
      this.cancel("Alvo perdido · retorne à base");
      return;
    }
    if (this.kind === 1 ? this.marked && this.marked.hp <= 0 : near && p.car) {
      if (this.kind === 2 && this.stage < 2) {
        this.stage++;
        return;
      }
      this.cash += 500;
      this.index++;
      this.cancel("Missão concluída · +$500");
      try {
        localStorage.nightfall = JSON.stringify({
          index: this.index,
          cash: this.cash,
        });
      } catch {}
    }
  }
}
