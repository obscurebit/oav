/**
 * Input handler — reads mouse position and keyboard state each frame.
 * Pull model: main loop reads state, no events propagated.
 */

export class Input {
  /** Mouse X normalized [0, 1] (left to right) */
  mouseX = 0.5;
  /** Mouse Y normalized [0, 1] (top to bottom) */
  mouseY = 0.5;
  /** Currently held keys */
  private _keys = new Set<string>();

  private _canvas: HTMLElement;

  constructor(canvas: HTMLElement) {
    this._canvas = canvas;
    this._bindMouse();
    this._bindKeyboard();
  }

  /** Check if a key is currently held. */
  isDown(key: string): boolean {
    return this._keys.has(key.toLowerCase());
  }

  private _bindMouse(): void {
    this._canvas.addEventListener("mousemove", (e: Event) => {
      const me = e as MouseEvent;
      const rect = this._canvas.getBoundingClientRect();
      this.mouseX = (me.clientX - rect.left) / rect.width;
      this.mouseY = (me.clientY - rect.top) / rect.height;
    });
  }

  private _bindKeyboard(): void {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      this._keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e: KeyboardEvent) => {
      this._keys.delete(e.key.toLowerCase());
    });
  }

  /** Apply input state to parameter store each frame. */
  applyTo(params: import("./params").ParameterStore): void {
    // Mouse X → hue shift
    params.set("hue", this.mouseX);
    // Mouse Y → intensity (inverted: top = high)
    params.set("intensity", 1.0 - this.mouseY);
  }

  dispose(): void {
    // In a real app we'd remove listeners; for a trackmo this is fine
  }
}
