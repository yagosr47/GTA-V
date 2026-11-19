export class InputManager {
  keys = new Set<string>();
  edge = new Set<string>();
  ax = 0;
  az = 0;
  dx = 0;
  dy = 0;
  private dragLook = false;
  touch = false;
  paused = false;
  constructor(public el: HTMLElement) {
    el.tabIndex = 0;
    onkeydown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code))
        e.preventDefault();
      if (!e.repeat) this.edge.add(e.code);
      this.keys.add(e.code);
      if (e.code === "Space") e.preventDefault();
    };
    onkeyup = (e) => this.keys.delete(e.code);
    onblur = () => this.reset();
    el.onpointerdown = (e) => {
      if (e.pointerType === "mouse" && !this.paused) {
        el.focus({ preventScroll: true });
        this.touch = false;
        if (document.pointerLockElement)
          this.keys.add(e.button === 2 ? "Aim" : "Fire");
        else {
          this.dragLook = true;
          try {
            el.requestPointerLock?.()?.catch(() => {});
          } catch {
            this.dragLook = true;
          }
        }
      }
    };
    onpointerup = (e) => {
      if (e.pointerType !== "mouse") return;
      this.dragLook = false;
      this.keys.delete(e.button === 2 ? "Aim" : "Fire");
    };
    onmousemove = (e) => {
      if (document.pointerLockElement || this.dragLook) {
        this.dx += e.movementX;
        this.dy += e.movementY;
      }
    };
    el.oncontextmenu = (e) => e.preventDefault();
    el.onwheel = (e) => {
      this.edge.add("KeyQ");
      e.preventDefault();
    };
  }
  reset() {
    this.dragLook = false;
    this.keys.clear();
    this.edge.clear();
    this.ax = this.az = this.dx = this.dy = 0;
  }
  get x() {
    return Math.max(
      -1,
      Math.min(
        1,
        this.ax +
          Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
          Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft")),
      ),
    );
  }
  get z() {
    return Math.max(
      -1,
      Math.min(
        1,
        this.az +
          Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) -
          Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")),
      ),
    );
  }
  get jump() {
    return this.take("Space");
  }
  get sprint() {
    return (
      this.keys.has("ShiftLeft") ||
      this.keys.has("ShiftRight") ||
      (this.touch && Math.hypot(this.ax, this.az) > 0.85)
    );
  }
  get interact() {
    return this.take("KeyF");
  }
  get fire() {
    return this.keys.has("Fire");
  }
  get aim() {
    return this.keys.has("Aim");
  }
  get reload() {
    return this.take("KeyR");
  }
  get weaponNext() {
    return this.take("KeyQ");
  }
  get vehicleThrottle() {
    return Math.max(0, this.z);
  }
  get vehicleBrake() {
    return Math.max(0, -this.z);
  }
  get vehicleSteer() {
    return this.x;
  }
  get handbrake() {
    return this.keys.has("Space");
  }
  take(k: string) {
    return this.edge.delete(k);
  }
}
