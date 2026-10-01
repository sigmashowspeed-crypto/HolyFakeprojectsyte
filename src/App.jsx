import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import JourneyScene from "./components/JourneyScene";
import { content } from "./content";

const stopProgress = [0.05, 0.19, 0.33, 0.47, 0.61];

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function ScrollHint({ hidden }) {
  return (
    <div className={`scroll-hint ${hidden ? "is-hidden" : ""}`} aria-hidden="true">
      <span>{content.continueHint}</span>
      <i />
    </div>
  );
}

function Intro({ onBegin, introRef, launching }) {
  return (
    <section className="intro" ref={introRef} aria-labelledby="intro-title">
      <div className="intro-glow" />
      <div className="intro-copy">
        <p className="eyebrow">{content.intro.eyebrow}</p>
        <h1 id="intro-title">{content.intro.title}</h1>
        <button type="button" onClick={onBegin} disabled={launching} className={launching ? "is-launching" : ""}>
          <span>{content.intro.button}</span>
          <b aria-hidden="true">✦</b>
        </button>
        <div className="intro-hint" aria-hidden="true">
          <span>{content.intro.hint}</span>
          <i />
        </div>
      </div>
    </section>
  );
}

function StopCard({ stop, index, active }) {
  return (
    <article className={`stop-card ${active ? "is-active" : ""}`} aria-hidden={!active}>
      <div className="stop-count">0{index + 1}</div>
      <p className="stop-flower">{stop.flower}</p>
      <h2>{stop.place}</h2>
      <div className="card-rule" style={{ "--accent": stop.accent }} />
      <p className="stop-message">{stop.message}</p>
    </article>
  );
}

function Pride({ progress }) {
  const local = Math.max(0, Math.min(1, (progress - 0.7) / 0.17));
  return (
    <section className={`pride-panel ${progress >= 0.69 && progress < 0.9 ? "is-active" : ""}`}>
      <p className="eyebrow">{content.intro.eyebrow}</p>
      <h2>{content.pride.title}</h2>
      <div className="pride-lines">
        {content.pride.lines.map((line, index) => (
          <p key={line} className={local > index * 0.2 + 0.08 ? "is-visible" : ""}>
            <span aria-hidden="true">✦</span>
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

function Confetti({ visible }) {
  const petals = useMemo(
    () => Array.from({ length: 80 }, (_, index) => ({
      left: `${(index * 37.7) % 100}%`,
      delay: `${(index % 12) * 0.09}s`,
      duration: `${3.8 + (index % 7) * 0.32}s`,
      color: ["#ffd0dc", "#f38bab", "#ffe59a", "#c7a8df"][index % 4],
      drift: `${((index * 29) % 150) - 75}px`,
    })),
    [],
  );

  if (!visible) return null;

  return (
    <div className="confetti" aria-hidden="true">
      {petals.map((petal, index) => (
        <i key={index} style={{
          "--left": petal.left,
          "--delay": petal.delay,
          "--duration": petal.duration,
          "--petal": petal.color,
          "--drift": petal.drift,
        }} />
      ))}
    </div>
  );
}

function Finale({ active, celebrated }) {
  return (
    <section className={`finale ${active ? "is-active" : ""}`}>
      <div className="finale-flowers" aria-hidden="true">❀　✿　❀</div>
      <h2 aria-label={content.finale.title}>
        {Array.from(content.finale.title).map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className={letter === " " ? "space" : ""}
            style={{ "--i": index, "--x": `${((index * 47) % 180) - 90}px`, "--y": `${((index * 31) % 120) - 60}px` }}
            aria-hidden="true"
          >
            {letter}
          </span>
        ))}
      </h2>
      <p className="finale-subtitle">{content.finale.subtitle}</p>
      <div className="letter">
        <span className="quote-mark" aria-hidden="true">“</span>
        <p>{content.finale.letter}</p>
        <div className="letter-signature">
          <span>{content.finale.signature}</span>
          <strong>Abdurahmon</strong>
        </div>
      </div>
      <Confetti visible={celebrated} />
    </section>
  );
}

function App() {
  const [started, setStarted] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [celebrated, setCelebrated] = useState(false);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const progressStateRef = useRef(0);
  const introRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    document.body.style.overflow = introVisible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [introVisible]);

  useEffect(() => {
    if (!started) return undefined;
    let frame = 0;
    let previousTime = performance.now();
    const readScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      targetProgressRef.current = max > 0 ? window.scrollY / max : 0;
    };
    const render = (time) => {
      const delta = Math.min(0.05, (time - previousTime) / 1000);
      previousTime = time;
      const target = targetProgressRef.current;
      const alpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 7.5);
      const next = Math.abs(target - progressRef.current) < 0.0001
        ? target
        : progressRef.current + (target - progressRef.current) * alpha;
      progressRef.current = next;
      if (Math.abs(next - progressStateRef.current) > 0.0015 || next === target) {
        progressStateRef.current = next;
        setProgress(next);
      }
      if (target > 0.905) setCelebrated(true);
      frame = requestAnimationFrame(render);
    };
    readScroll();
    frame = requestAnimationFrame(render);
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
    };
  }, [started, reducedMotion]);

  const begin = () => {
    if (launching) return;
    setLaunching(true);
    window.scrollTo({ top: 0, behavior: "instant" });
    progressRef.current = 0;
    targetProgressRef.current = 0;
    progressStateRef.current = 0;
    setProgress(0);
    setStarted(true);
    const duration = reducedMotion ? 0.2 : 1.05;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const copy = introRef.current?.querySelector(".intro-copy");
      const glow = introRef.current?.querySelector(".intro-glow");
      const timeline = gsap.timeline({ onComplete: () => setIntroVisible(false) });
      timeline.to(glow, {
        scale: reducedMotion ? 1 : 1.28,
        opacity: 0.12,
        duration: duration * 0.82,
        ease: "power2.out",
      }, 0).to(copy, {
        y: reducedMotion ? 0 : -16,
        opacity: 0,
        duration: duration * 0.7,
        ease: "power2.in",
      }, 0.08).to(introRef.current, {
        opacity: 0,
        duration,
        ease: "power2.inOut",
      }, 0.16);
    }));
  };

  const activeStop = progress < 0.69
    ? stopProgress.reduce((best, point, index) => (
      Math.abs(point - progress) < Math.abs(stopProgress[best] - progress) ? index : best
    ), 0)
    : -1;
  const finaleActive = progress >= 0.9;
  const atmosphereClass = finaleActive
    ? "is-finale"
    : progress >= 0.69
      ? "is-pride"
      : `stage-${Math.max(0, activeStop)}`;

  return (
    <main className={`app ${started ? "has-started" : ""} ${atmosphereClass}`}>
      <div className="scene" aria-hidden="true">
        <Suspense fallback={null}>
          <JourneyScene progressRef={progressRef} reducedMotion={reducedMotion} started={started} />
        </Suspense>
        <div className="scene-atmosphere" />
        <div className="scene-vignette" />
        <div className="scene-grain" />
      </div>

      {introVisible && <Intro onBegin={begin} introRef={introRef} launching={launching} />}

      <div className="journey-content">
        <header className={`journey-header ${progress >= 0.69 ? "is-hidden" : ""}`}>
          <span className="tiny-flower" aria-hidden="true">✿</span>
          <span>{content.journeyLabel}</span>
        </header>

        <aside className={`progress-nav ${progress >= 0.69 ? "is-hidden" : ""}`} aria-label={content.progressLabel}>
          <div className="progress-track">
            <i style={{ transform: `scaleY(${Math.min(1, progress / 0.88)})` }} />
          </div>
          {content.stops.map((stop, index) => (
            <span key={stop.place} className={activeStop === index ? "is-active" : ""}>
              <b>{index + 1}</b>
              <em>{stop.place}</em>
            </span>
          ))}
        </aside>

        <div className="cards" aria-live="polite">
          {activeStop >= 0 && progress < 0.69 && (
            <StopCard
              key={content.stops[activeStop].place}
              stop={content.stops[activeStop]}
              index={activeStop}
              active
            />
          )}
        </div>

        <Pride progress={progress} />
        <Finale active={finaleActive} celebrated={celebrated} />
        <ScrollHint hidden={progress > 0.06 || finaleActive} />
      </div>

      <div className="scroll-space" aria-hidden="true" />
    </main>
  );
}

export default App;
