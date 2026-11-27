import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./reducer";

describe("explorer reducer", () => {
  it("starts idle but armed to play", () => {
    const state = initialState(6);
    expect(state.current).toBe(-1);
    expect(state.playing).toBe(true);
    expect(state.done).toBe(false);
  });

  it("starts typing at the first question", () => {
    const state = reducer(initialState(6), { type: "start" });
    expect(state.current).toBe(0);
    expect(state.phase).toBe("typing");
  });

  it("does not restart once started", () => {
    const started = reducer(initialState(6), { type: "start" });
    const again = reducer({ ...started, current: 3 }, { type: "start" });
    expect(again.current).toBe(3);
  });

  it("reveals the answer and marks the question asked", () => {
    const state = reducer(reducer(initialState(6), { type: "start" }), { type: "reveal" });
    expect(state.phase).toBe("answer");
    expect(state.asked).toEqual([0]);
  });

  it("does not duplicate the asked marker", () => {
    let state = reducer(initialState(6), { type: "start" });
    state = reducer(state, { type: "reveal" });
    state = reducer(state, { type: "reveal" });
    expect(state.asked).toEqual([0]);
  });

  it("ignores reveal before start", () => {
    const state = reducer(initialState(6), { type: "reveal" });
    expect(state.phase).toBe("typing");
    expect(state.asked).toEqual([]);
  });

  it("advances to the next question and types again", () => {
    let state = reducer(initialState(6), { type: "start" });
    state = reducer(state, { type: "reveal" });
    state = reducer(state, { type: "advance" });
    expect(state.current).toBe(1);
    expect(state.phase).toBe("typing");
    expect(state.done).toBe(false);
  });

  it("stops after the last question", () => {
    const state = reducer(
      { count: 2, current: 1, asked: [0, 1], playing: true, phase: "answer", done: false },
      { type: "advance" },
    );
    expect(state.done).toBe(true);
    expect(state.playing).toBe(false);
    expect(state.current).toBe(1);
  });

  it("ignores advance before start", () => {
    const state = reducer(initialState(6), { type: "advance" });
    expect(state.current).toBe(-1);
  });

  it("jumps to a tapped stage and resumes", () => {
    let state = reducer(initialState(6), { type: "jump", index: 4 });
    expect(state.current).toBe(4);
    expect(state.phase).toBe("typing");
    expect(state.done).toBe(false);
    expect(state.playing).toBe(true);

    state = reducer({ ...state, playing: false, done: true }, { type: "jump", index: 2 });
    expect(state.playing).toBe(true);
    expect(state.done).toBe(false);
  });

  it("pauses and resumes without losing position", () => {
    let state = reducer(reducer(initialState(6), { type: "start" }), { type: "pause" });
    expect(state.playing).toBe(false);
    expect(state.current).toBe(0);

    state = reducer(state, { type: "play" });
    expect(state.playing).toBe(true);
  });

  it("restarts from the beginning", () => {
    const state = reducer(
      { count: 6, current: 3, asked: [0, 1, 2], playing: false, phase: "answer", done: true },
      { type: "restart" },
    );
    expect(state).toEqual({
      count: 6,
      current: 0,
      asked: [],
      playing: true,
      phase: "typing",
      done: false,
    });
  });
});