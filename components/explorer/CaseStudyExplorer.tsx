"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import type { ExplorerData } from "@/lib/content";
import { initialState, reducer, type ExplorerAction, type ExplorerState } from "./reducer";
import { useExplorerTimers } from "./useExplorerTimers";
import { Widget } from "./widgets";

const PANEL = "rounded-[8px] border border-rule bg-surface";
const MONO = "font-mono text-[11px] tracking-[0.14em] uppercase";

export function CaseStudyExplorer({ data }: { data: ExplorerData }) {
  const [state, dispatch] = useReducer(reducer, data.questions.length, initialState);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          dispatch({ type: "start" });
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const onVisibility = () => dispatch({ type: document.hidden ? "pause" : "play" });
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reduced]);

  useExplorerTimers(state, visible, reduced, dispatch);

  return (
    <section
      ref={rootRef}
      id="explorer"
      aria-label="Case study explorer"
      className="border-t border-rule"
    >
      <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
        <p className={`${MONO} text-ink-faint`}>01 — Explorer</p>
        <h2 className="mt-4 max-w-[26ch] text-[clamp(28px,3.4vw,44px)] leading-[1.06] font-semibold tracking-[-0.02em]">
          Ask the work, not the résumé.
        </h2>
        <p className="mt-4 max-w-[58ch] text-[16px] text-ink-muted">
          Six questions in the order a project actually happens. Tap a stage to jump.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          <div className={`${PANEL} p-6 lg:col-span-8 md:p-8`}>
            {reduced ? (
              <StaticTranscript data={data} />
            ) : (
              <LiveTranscript data={data} state={state} dispatch={dispatch} />
            )}
          </div>

          <aside className="lg:col-span-4">
            <div className={`${PANEL} p-6`}>
              <p className={`${MONO} text-ink-faint`}>Stages</p>
              <StageCard data={data} state={state} dispatch={dispatch} reduced={reduced} />
              <p className={`mt-6 ${MONO} text-ink-faint`}>
                {Math.max(0, state.asked.length)} / {data.questions.length} answered
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function LiveTranscript({
  data,
  state,
  dispatch,
}: {
  data: ExplorerData;
  state: ExplorerState;
  dispatch: React.Dispatch<ExplorerAction>;
}) {
  const current = state.current < 0 ? 0 : state.current;
  const question = data.questions[current];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className={`${MONO} text-ink-muted`}>
          Case explorer · {String(current + 1).padStart(2, "0")} /{" "}
          {String(data.questions.length).padStart(2, "0")}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: state.playing ? "pause" : "play" })}
            className="min-h-11 rounded-[8px] border border-rule px-3 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors duration-200 hover:border-ink-faint"
          >
            {state.playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "restart" })}
            disabled={!state.done}
            className="min-h-11 rounded-[8px] border border-rule px-3 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors duration-200 hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restart
          </button>
        </div>
      </div>

      <ProgressBars
        count={data.questions.length}
        current={state.current}
        asked={state.asked}
      />

      {question ? (
        <div className="mt-8 space-y-6">
          <QuestionRow label="You">{question.question}</QuestionRow>

          <div className="flex gap-4">
            <Avatar label="HF" />
            <div aria-live="polite" className="min-w-0 flex-1">
              {state.phase === "answer" ? (
                <>
                  <p className="max-w-[62ch] text-[17px]">{question.answer}</p>
                  {question.widgets.length > 0 ? (
                    <div className="mt-6 space-y-4">
                      {question.widgets.map((key) => {
                        const widget = data.widgets[key];
                        if (!widget) return null;
                        return <Widget key={key} type={widget.type} data={widget} />;
                      })}
                    </div>
                  ) : null}
                  <Link
                    href={`/work/${question.caseStudy}`}
                    className={`mt-6 inline-block ${MONO} text-ink-muted underline underline-offset-3 transition-colors duration-200 hover:text-ink`}
                  >
                    Read the full case study
                  </Link>
                </>
              ) : (
                <TypingDots />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StaticTranscript({ data }: { data: ExplorerData }) {
  return (
    <ol className="space-y-10">
      {data.questions.map((question, index) => (
        <li key={question.id} id={`q-${question.id}`} className="scroll-mt-24">
          <p className={`${MONO} text-ink-faint`}>
            {String(index + 1).padStart(2, "0")} · {question.stage}
          </p>
          <div className="mt-4">
            <QuestionRow label="You">{question.question}</QuestionRow>
          </div>
          <div className="mt-4 flex gap-4">
            <Avatar label="HF" />
            <div className="min-w-0 flex-1">
              <p className="max-w-[62ch] text-[17px]">{question.answer}</p>
              {question.widgets.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {question.widgets.map((key) => {
                    const widget = data.widgets[key];
                    if (!widget) return null;
                    return <Widget key={key} type={widget.type} data={widget} />;
                  })}
                </div>
              ) : null}
              <Link
                href={`/work/${question.caseStudy}`}
                className={`mt-5 inline-block ${MONO} text-ink-muted underline underline-offset-3 transition-colors duration-200 hover:text-ink`}
              >
                Read the full case study
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StageCard({
  data,
  state,
  dispatch,
  reduced,
}: {
  data: ExplorerData;
  state: ExplorerState;
  dispatch: React.Dispatch<ExplorerAction>;
  reduced: boolean;
}) {
  return (
    <ul className="mt-5">
      {data.questions.map((question, index) => {
        const asked = state.asked.includes(index);
        const current = index === state.current;
        const marker = asked ? "✓" : current ? "▸" : "·";
        const row = (
          <>
            <span
              aria-hidden="true"
              className={`mt-[2px] w-4 font-mono text-[12px] ${
                asked ? "text-verified" : current ? "text-ink" : "text-ink-faint"
              }`}
            >
              {marker}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-medium">{question.label}</span>
              <span className="block font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
                {question.stage}
              </span>
            </span>
          </>
        );

        const className =
          "flex w-full gap-3 border-b border-rule py-3 text-left transition-colors duration-200 hover:text-accent-ink";

        return (
          <li key={question.id}>
            {reduced ? (
              <a href={`#q-${question.id}`} className={className}>
                {row}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => dispatch({ type: "jump", index })}
                aria-current={current ? "step" : undefined}
                className={className}
              >
                {row}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ProgressBars({
  count,
  current,
  asked,
}: {
  count: number;
  current: number;
  asked: number[];
}) {
  return (
    <div className="mt-6 flex gap-1" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        const answered = asked.includes(index);
        const active = index === current;
        return (
          <span
            key={index}
            className={`h-1 flex-1 rounded-[2px] ${
              answered ? "bg-accent" : active ? "bg-ink" : "bg-rule"
            }`}
          />
        );
      })}
    </div>
  );
}

function QuestionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <Avatar label={label} />
      <p className="min-w-0 flex-1 text-[19px] leading-[1.4] font-semibold tracking-[-0.01em]">
        {children}
      </p>
    </div>
  );
}

function Avatar({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="mt-[2px] flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-rule bg-paper font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase"
    >
      {label}
    </span>
  );
}

function TypingDots() {
  return (
    <span className="flex h-6 items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-[6px] w-[6px] rounded-full bg-ink-faint"
          style={{ animation: `explorer-dot 1.1s ${index * 0.16}s infinite var(--ease-editorial)` }}
        />
      ))}
    </span>
  );
}
