import { InputManager } from "../core/InputManager";
export class TouchControls {
  el = document.createElement("div");
  enabled = matchMedia("(pointer:coarse)").matches;
  car = false;
  constructor(public i: InputManager) {
    document.body.append(this.el);
    this.el.className = "touch";
    this.layout();
    window.addEventListener(
      "pointerdown",
      () => {
        if (this.enabled) {
          document.documentElement
            .requestFullscreen?.()
            .then(() =>
              (
                screen.orientation as ScreenOrientation & {
                  lock?: (v: string) => Promise<void>;
                }
              ).lock?.("landscape"),
            )
            .catch(() => {});
        }
      },
      { once: true },
    );
  }
  layout() {
    this.el.hidden = !this.enabled;
    this.el.innerHTML =
      '<div class="stickarea"><div class="stick"><b></b></div></div><div class="look"></div><div class="pads"></div>';
    let stick = this.el.querySelector<HTMLElement>(".stick")!,
      knob = stick.firstElementChild as HTMLElement;
    let bind = (
      el: HTMLElement,
      fn: (x: number, y: number, start: boolean) => void,
      end: () => void,
    ) => {
      let id = -1,
        x = 0,
        y = 0;
      el.onpointerdown = (e) => {
        if (id !== -1) return;
        id = e.pointerId;
        el.setPointerCapture(id);
        x = e.clientX;
        y = e.clientY;
        this.i.touch = true;
        fn(0, 0, true);
      };
      el.onpointermove = (e) => {
        if (e.pointerId === id) {
          fn(e.clientX - x, e.clientY - y, false);
          if (!el.classList.contains("stickarea")) {
            x = e.clientX;
            y = e.clientY;
          }
        }
      };
      el.onlostpointercapture = () => {
        id = -1;
        end();
      };
    };
    let zone = this.el.querySelector<HTMLElement>(".stickarea")!;
    zone.addEventListener("pointerdown", (e) => {
      let r = zone.getBoundingClientRect();
      stick.style.left = `${e.clientX - r.left - 50}px`;
      stick.style.top = `${e.clientY - r.top - 50}px`;
    });
    bind(
      zone,
      (x, y) => {
        let r = Math.max(34, Math.hypot(x, y));
        this.i.ax = Math.abs(x) > 4 ? x / r : 0;
        this.i.az = Math.abs(y) > 4 ? -y / r : 0;
        knob.style.transform = `translate(${(x / r) * 28}px,${(y / r) * 28}px)`;
      },
      () => {
        this.i.ax = this.i.az = 0;
        knob.style.transform = "";
        stick.style.left = stick.style.top = "";
      },
    );
    bind(
      this.el.querySelector(".look")!,
      (x, y) => {
        this.i.dx += x;
        this.i.dy += y;
      },
      () => {},
    );
    for (let [label, key] of this.car
      ? [
          ["Acelerar", "KeyW"],
          ["Freio / Ré", "KeyS"],
          ["Drift", "Space"],
          ["Sair", "KeyF"],
        ]
      : [
          ["Atirar", "Fire"],
          ["Mira", "Aim"],
          ["Pular", "Space"],
          ["Trocar", "KeyQ"],
          ["Entrar", "KeyF"],
        ]) {
      let b = document.createElement("button");
      b.textContent = label;
      b.dataset.key = key;
      this.el.querySelector(".pads")!.append(b);
      bind(
        b,
        (x, y, start) => {
          if (start) {
            this.i.keys.add(key);
            this.i.edge.add(key);
          }
          if (key === "Fire") {
            this.i.dx += x;
            this.i.dy += y;
          }
        },
        () => this.i.keys.delete(key),
      );
    }
  }
  update(car: boolean, near: boolean) {
    if (car !== this.car) {
      this.car = car;
      this.i.reset();
      this.layout();
    }
    this.el.querySelector<HTMLElement>("[data-key=KeyF]")!.hidden =
      !car && !near;
  }
  toggle() {
    this.enabled = !this.enabled;
    this.i.reset();
    this.layout();
  }
}
