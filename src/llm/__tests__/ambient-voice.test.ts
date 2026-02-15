import { describe, it, expect, vi } from "vitest";
import { AmbientVoice } from "../director";

describe("AmbientVoice", () => {
  it("fires a word after the interval", () => {
    const voice = new AmbientVoice(5, 5); // Fixed 5s interval for predictability
    const cb = vi.fn();
    voice.onWords(cb);

    // Before interval — no call
    voice.update(3);
    expect(cb).not.toHaveBeenCalled();

    // After interval — should fire
    voice.update(6);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(typeof cb.mock.calls[0][0]).toBe("string");
  });

  it("fires multiple times over long elapsed", () => {
    const voice = new AmbientVoice(2, 2);
    const cb = vi.fn();
    voice.onWords(cb);

    voice.update(3);
    expect(cb).toHaveBeenCalledTimes(1);

    voice.update(6);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("does not fire if no callback set", () => {
    const voice = new AmbientVoice(1, 1);
    // Should not throw
    voice.update(5);
  });
});
