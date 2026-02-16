/**
 * Timeline: ordered list of scene entries.
 * Returns the active scene and normalized progress for a given time.
 */

export interface TimelineEntry {
  startTime: number;
  endTime: number;
  sceneId: string;
  /** Duration in seconds of the crossfade into this scene. Defaults to 0. */
  transitionDuration?: number;
}

export interface ActiveScene {
  sceneId: string;
  /** Normalized progress within the scene [0, 1]. */
  progress: number;
  /** Absolute time within the scene in seconds. */
  localTime: number;
}

export interface TransitionState {
  /** The current (incoming) scene. */
  current: ActiveScene;
  /** The previous (outgoing) scene, if in a transition. */
  previous: ActiveScene | null;
  /** Blend factor [0, 1]. 0 = fully previous, 1 = fully current. */
  blend: number;
}

export class Timeline {
  private _entries: TimelineEntry[] = [];

  /** Add a scene entry. Entries should be added in chronological order. */
  add(entry: TimelineEntry): void {
    this._entries.push(entry);
    this._entries.sort((a, b) => a.startTime - b.startTime);
  }

  /** Get the active scene at a given time. Returns null if no scene covers this time. */
  getActiveScene(time: number): ActiveScene | null {
    // Walk backwards so later (overlapping) entries take priority
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const entry = this._entries[i];
      if (time >= entry.startTime && time < entry.endTime) {
        const duration = entry.endTime - entry.startTime;
        const localTime = time - entry.startTime;
        return {
          sceneId: entry.sceneId,
          progress: duration > 0 ? localTime / duration : 0,
          localTime,
        };
      }
    }
    return null;
  }

  /** Total duration of the timeline (end of last entry). */
  get duration(): number {
    if (this._entries.length === 0) return 0;
    return Math.max(...this._entries.map((e) => e.endTime));
  }

  /** Number of entries. */
  get length(): number {
    return this._entries.length;
  }

  /**
   * Get transition state at a given time.
   * Returns current scene, optional previous scene, and blend factor.
   */
  getTransitionState(time: number): TransitionState | null {
    const current = this.getActiveScene(time);
    if (!current) return null;

    // Find the current entry to check its transition duration
    const currentEntry = this._entries.find(
      (e) => e.sceneId === current.sceneId && time >= e.startTime && time < e.endTime
    );
    if (!currentEntry) return { current, previous: null, blend: 1 };

    const transDur = currentEntry.transitionDuration ?? 0;
    const timeIntoScene = time - currentEntry.startTime;

    if (transDur <= 0 || timeIntoScene >= transDur) {
      return { current, previous: null, blend: 1 };
    }

    // We're in a transition — find the previous entry
    const currentIdx = this._entries.indexOf(currentEntry);
    let previous: ActiveScene | null = null;

    if (currentIdx > 0) {
      const prevEntry = this._entries[currentIdx - 1];
      // Compute where we'd be in the previous scene at this time
      const prevDuration = prevEntry.endTime - prevEntry.startTime;
      const prevLocalTime = time - prevEntry.startTime;
      if (prevLocalTime >= 0 && prevDuration > 0) {
        previous = {
          sceneId: prevEntry.sceneId,
          progress: Math.min(prevLocalTime / prevDuration, 1),
          localTime: prevLocalTime,
        };
      }
    }

    const blend = timeIntoScene / transDur;
    return { current, previous, blend };
  }

  /** Remove entries that ended before the given time (keeps memory bounded). */
  prune(beforeTime: number): void {
    // Keep at least the entry before current time (needed for transitions)
    this._entries = this._entries.filter((e) => e.endTime >= beforeTime - 10);
  }

  /** Get all entries (read-only copy). */
  get entries(): readonly TimelineEntry[] {
    return [...this._entries];
  }
}
