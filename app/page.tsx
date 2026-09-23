"use client";

import { Sora, Inter } from "next/font/google";
import { useCallback, useEffect, useMemo, useState } from "react";
import "../app/globals.css";

// ---------------------------------------------------------------------------
// Tipografía
// ---------------------------------------------------------------------------
const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

// ---------------------------------------------------------------------------
// Banco de palabras por nivel
// ---------------------------------------------------------------------------
interface WordEntry {
  word: string;
  hint: string;
  category: string;
}

const WORD_BANK: Record<number, WordEntry[]> = {
  1: [
    { word: "CAJA", hint: "Institución financiera", category: "Finanzas" },
    { word: "AHORRO", hint: "Guardar dinero para el futuro", category: "Finanzas" },
    { word: "CREDITO", hint: "Dinero prestado que se devuelve", category: "Finanzas" },
    { word: "BANCO", hint: "Entidad donde guardas tu dinero", category: "Finanzas" },
    { word: "PAGO", hint: "Acción de cancelar una deuda", category: "Finanzas" },
    { word: "META", hint: "Objetivo que quieres alcanzar", category: "General" },
  ],
  2: [
    { word: "INTERES", hint: "Ganancia que genera tu ahorro", category: "Finanzas" },
    { word: "DEPOSITO", hint: "Dinero que ingresas a tu cuenta", category: "Finanzas" },
    { word: "CUENTA", hint: "Registro de tus movimientos", category: "Finanzas" },
    { word: "TARJETA", hint: "Plástico para pagar o retirar", category: "Finanzas" },
    { word: "PRESTAMO", hint: "Dinero que recibes y devuelves", category: "Finanzas" },
    { word: "MONEDA", hint: "Dinero en efectivo", category: "General" },
  ],
  3: [
    { word: "INVERSION", hint: "Poner dinero a trabajar", category: "Finanzas" },
    { word: "PRESUPUESTO", hint: "Plan de ingresos y gastos", category: "Finanzas" },
    { word: "TRANSFERENCIA", hint: "Enviar dinero entre cuentas", category: "Finanzas" },
    { word: "SEGURO", hint: "Protección ante imprevistos", category: "Finanzas" },
    { word: "PLAZO", hint: "Tiempo para pagar o ahorrar", category: "Finanzas" },
    { word: "CLAVE", hint: "Secreto para proteger tu cuenta", category: "Seguridad" },
  ],
  4: [
    { word: "CAPITALIZACION", hint: "Reinvertir las ganancias", category: "Finanzas" },
    { word: "DIVERSIFICACION", hint: "Repartir el riesgo", category: "Finanzas" },
    { word: "LIQUIDEZ", hint: "Facilidad de convertir en efectivo", category: "Finanzas" },
    { word: "PATRIMONIO", hint: "Conjunto de tus bienes", category: "Finanzas" },
    { word: "RENTABILIDAD", hint: "Ganancia de una inversión", category: "Finanzas" },
    { word: "ENDOSO", hint: "Ceder un título a otra persona", category: "Finanzas" },
  ],
};

const MAX_LEVEL = 4;
const MAX_ERRORS = 6;
const POINTS_PER_WORD = 100;
const TIME_BONUS_FACTOR = 5;
const TIME_PER_LEVEL = [90, 100, 110, 120] as const;
const RANKING_STORAGE_KEY = "hangman-ranking";

type Screen = "menu" | "game" | "gameover" | "ranking" | "name" | "levelcomplete";

interface RankingEntry {
  name: string;
  score: number;
  date: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadRanking(): RankingEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RANKING_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as RankingEntry[]) : [];
  } catch {
    return [];
  }
}

function saveRanking(ranking: RankingEntry[]) {
  try {
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(ranking));
  } catch {
    /* ignore */
  }
}

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

// ---------------------------------------------------------------------------
// Iconos
// ---------------------------------------------------------------------------
type IconProps = { className?: string };
const iconBase = "1.75";

const IconHeart = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={iconBase} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />
  </svg>
);

const IconClock = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={iconBase} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

const IconStar = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={iconBase} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9L12 16.8l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.7z" />
  </svg>
);

const IconTrophy = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={iconBase} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 4h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Z" />
    <path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" />
    <path d="M12 13v3m-3 4h6m-3 0v-4" />
  </svg>
);

const IconExit = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={iconBase} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h11" />
  </svg>
);

const IconExpand = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={iconBase} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
  </svg>
);

const IconCollapse = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={iconBase} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />
  </svg>
);

const IconPlay = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

const IconBulb = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={iconBase} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5c-.6.6-1 1.5-1 2.5H9c0-1-.4-1.9-1-2.5A6 6 0 0 1 12 3Z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Estilos base
// ---------------------------------------------------------------------------
const BRAND_BACKDROP =
  "relative bg-[radial-gradient(120%_100%_at_50%_-10%,#FF3B4E_0%,#C81E2C_45%,#7A0F1C_100%)] " +
  "before:content-[''] before:absolute before:inset-0 before:opacity-[0.06] before:pointer-events-none " +
  "before:bg-[radial-gradient(circle_at_1px_1px,#FFFFFF_1px,transparent_0)] before:bg-[length:22px_22px]";

const CARD_SURFACE = "rounded-3xl bg-white shadow-[0_25px_70px_-20px_rgba(0,0,0,0.55)] border border-black/5";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 bg-[#C81E2C] hover:bg-[#A6172A] active:scale-[0.98] text-white font-semibold rounded-xl shadow-lg shadow-[#C81E2C]/30 transition-all duration-200";

const BTN_GHOST_LIGHT =
  "inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-full transition-colors duration-200";

// ---------------------------------------------------------------------------
// Dibujo del ahorcado (SVG animado)
// ---------------------------------------------------------------------------
function HangmanDrawing({ errors }: { errors: number }) {
  const stroke = "#7A0F1C";
  const strokeWidth = 3.5;
  const commonProps = {
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    fill: "none",
  };

  // Cada parte aparece según los errores cometidos
  const parts = [
    // 0 - base (siempre visible)
    <line key="base" x1="20" y1="180" x2="100" y2="180" {...commonProps} />,
    // 1 - poste
    <line key="poste" x1="60" y1="180" x2="60" y2="30" {...commonProps} />,
    // 2 - viga superior
    <line key="viga" x1="60" y1="30" x2="140" y2="30" {...commonProps} />,
    // 3 - cuerda
    <line key="cuerda" x1="140" y1="30" x2="140" y2="55" {...commonProps} />,
    // 4 - cabeza
    <circle key="cabeza" cx="140" cy="72" r="17" {...commonProps} />,
    // 5 - cuerpo
    <line key="cuerpo" x1="140" y1="89" x2="140" y2="135" {...commonProps} />,
    // 6 - brazo izquierdo
    <line key="brazo-izq" x1="140" y1="100" x2="118" y2="122" {...commonProps} />,
    // 7 - brazo derecho
    <line key="brazo-der" x1="140" y1="100" x2="162" y2="122" {...commonProps} />,
    // 8 - pierna izquierda
    <line key="pierna-izq" x1="140" y1="135" x2="120" y2="165" {...commonProps} />,
    // 9 - pierna derecha
    <line key="pierna-der" x1="140" y1="135" x2="160" y2="165" {...commonProps} />,
  ];

  // errors = 0 → muestra base + poste + viga + cuerda (4 partes)
  // cada error adicional añade una parte del cuerpo
  const visibleParts = 4 + errors;

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[240px] mx-auto" aria-hidden="true">
      {parts.slice(0, visibleParts).map((part, i) => (
        <g
          key={i}
          style={{
            opacity: 0,
            animation: `drawIn 0.4s ease-out forwards`,
            animationDelay: `${i * 0.05}s`,
          }}
        >
          {part}
        </g>
      ))}
      {/* Cabeza con expresión triste si hay muchos errores */}
      {errors >= 5 && (
        <>
          <circle cx="134" cy="68" r="1.8" fill={stroke} />
          <circle cx="146" cy="68" r="1.8" fill={stroke} />
          <path d="M135 80 Q140 77 145 80" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function HangmanGame() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [level, setLevel] = useState(1);
  const [currentEntry, setCurrentEntry] = useState<WordEntry | null>(null);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(TIME_PER_LEVEL[0]);
  const [active, setActive] = useState(false);
  const [score, setScore] = useState(0);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [roundWords, setRoundWords] = useState<WordEntry[]>([]);
  const [wordIndex, setWordIndex] = useState(0);

  const isLowTime = timeLeft <= 15;
  const wordLetters = useMemo(
    () => (currentEntry ? currentEntry.word.split("") : []),
    [currentEntry]
  );
  const revealedWord = useMemo(
    () => wordLetters.map((l) => (guessed.has(l) ? l : "_")).join(" "),
    [wordLetters, guessed]
  );
  const isWon = useMemo(
    () => wordLetters.length > 0 && wordLetters.every((l) => guessed.has(l)),
    [wordLetters, guessed]
  );
  const isLost = errors >= MAX_ERRORS;

  // ---------------------------------------------------------------------
  // Fullscreen
  // ---------------------------------------------------------------------
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ---------------------------------------------------------------------
  // Ranking persistente
  // ---------------------------------------------------------------------
  useEffect(() => {
    setRanking(loadRanking());
  }, []);

  useEffect(() => {
    saveRanking(ranking);
  }, [ranking]);

  // ---------------------------------------------------------------------
  // Iniciar partida
  // ---------------------------------------------------------------------
  const startGame = useCallback(() => {
    const round = [...WORD_BANK[1]].sort(() => Math.random() - 0.5).slice(0, 3);
    setRoundWords(round);
    setWordIndex(0);
    setCurrentEntry(round[0]);
    setGuessed(new Set());
    setErrors(0);
    setTimeLeft(TIME_PER_LEVEL[0]);
    setActive(true);
    setScreen("game");
    setLevel(1);
    setScore(0);
    setTimerPaused(false);
    setUsedHint(false);
    setWordsCompleted(0);
  }, []);

  // ---------------------------------------------------------------------
  // Avanzar al siguiente nivel
  // ---------------------------------------------------------------------
  const goToNextLevel = useCallback(() => {
    setScreen("game");
    setTimerPaused(false);
    setLevel((prev) => {
      const newLevel = prev + 1;
      if (newLevel > MAX_LEVEL) return prev;
      const round = [...WORD_BANK[newLevel]].sort(() => Math.random() - 0.5).slice(0, 3);
      setRoundWords(round);
      setWordIndex(0);
      setCurrentEntry(round[0]);
      setGuessed(new Set());
      setErrors(0);
      setTimeLeft(TIME_PER_LEVEL[newLevel - 1]);
      setActive(true);
      setUsedHint(false);
      return newLevel;
    });
  }, []);

  // ---------------------------------------------------------------------
  // Siguiente palabra dentro del mismo nivel
  // ---------------------------------------------------------------------
  const goToNextWord = useCallback(() => {
    setWordIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= roundWords.length) {
        // Nivel completado
        if (level >= MAX_LEVEL) {
          setScreen("gameover");
        } else {
          setScreen("levelcomplete");
        }
        return prevIndex;
      }
      setCurrentEntry(roundWords[nextIndex]);
      setGuessed(new Set());
      setErrors(0);
      setUsedHint(false);
      return nextIndex;
    });
  }, [roundWords, level]);

  // ---------------------------------------------------------------------
  // Terminar partida → guardar puntaje
  // ---------------------------------------------------------------------
  const resetGame = useCallback(() => setScreen("name"), []);

  const submitScore = useCallback(() => {
    const entry: RankingEntry = {
      name: playerName.trim() || "Anónimo",
      score,
      date: new Date().toLocaleString(),
    };
    setRanking((prev) => [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 10));
    setLevel(1);
    setCurrentEntry(null);
    setGuessed(new Set());
    setErrors(0);
    setScore(0);
    setTimeLeft(TIME_PER_LEVEL[0]);
    setActive(false);
    setPlayerName("");
    setScreen("menu");
  }, [playerName, score]);

  const exitToMenu = useCallback(() => {
    setActive(false);
    setScreen("menu");
    setShowExitConfirm(false);
  }, []);

  // ---------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!active || screen !== "game" || timerPaused) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setActive(false);
          setScreen("gameover");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [active, screen, timerPaused]);

  // ---------------------------------------------------------------------
  // Detectar victoria / derrota de la palabra
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!active || screen !== "game" || !currentEntry) return;

    if (isWon) {
      setTimerPaused(true);
      const timeBonus = timeLeft * TIME_BONUS_FACTOR;
      const hintPenalty = usedHint ? 30 : 0;
      const points = Math.max(0, POINTS_PER_WORD + timeBonus - hintPenalty - errors * 10);
      setScore((s) => s + points);
      setWordsCompleted((w) => w + 1);

      const timeout = setTimeout(() => {
        setTimerPaused(false);
        goToNextWord();
      }, 1400);
      return () => clearTimeout(timeout);
    }

    if (isLost) {
      setTimerPaused(true);
      const timeout = setTimeout(() => {
        setActive(false);
        setScreen("gameover");
      }, 1600);
      return () => clearTimeout(timeout);
    }
  }, [isWon, isLost, active, screen, currentEntry, timeLeft, errors, usedHint, goToNextWord]);

  // ---------------------------------------------------------------------
  // Manejo de teclas (físico + virtual)
  // ---------------------------------------------------------------------
  const handleGuess = useCallback(
    (letter: string) => {
      if (!active || timerPaused || !currentEntry) return;
      if (guessed.has(letter) || errors >= MAX_ERRORS) return;

      setGuessed((prev) => new Set(prev).add(letter));

      if (!currentEntry.word.includes(letter)) {
        setErrors((e) => e + 1);
      }
    },
    [active, timerPaused, currentEntry, guessed, errors]
  );

  useEffect(() => {
    if (screen !== "game") return;
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (ALPHABET.includes(key)) handleGuess(key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, handleGuess]);

  // ---------------------------------------------------------------------
  // Pista
  // ---------------------------------------------------------------------
  const revealHint = useCallback(() => {
    if (!currentEntry || usedHint || !active) return;
    setUsedHint(true);
    // Revela una letra que aún no esté adivinada
    const hidden = wordLetters.filter((l) => !guessed.has(l));
    if (hidden.length > 0) {
      const letter = pickRandom(hidden);
      setGuessed((prev) => new Set(prev).add(letter));
    }
  }, [currentEntry, usedHint, active, wordLetters, guessed]);

  const fontVars = `${sora.variable} ${inter.variable}`;

  // =====================================================================
  // PANTALLA: NOMBRE
  // =====================================================================
  if (screen === "name") {
    return (
      <div className={`${fontVars} font-[family-name:var(--font-body)] flex flex-col justify-center items-center min-h-screen p-6 ${BRAND_BACKDROP}`}>
        <div className={`relative w-full max-w-sm p-8 ${CARD_SURFACE}`}>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C81E2C] mb-2">Nuevo puntaje</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#1A0A0D] mb-6">
            Guarda tu resultado
          </h1>
          <label htmlFor="player-name" className="block text-sm font-medium text-[#7A0F1C] mb-2">
            Tu nombre
          </label>
          <input
            id="player-name"
            type="text"
            placeholder="Ej. María Torres"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitScore()}
            maxLength={20}
            autoFocus
            className="w-full p-3 rounded-xl border border-black/10 bg-white mb-6 text-[#1A0A0D] outline-none focus:ring-2 focus:ring-[#C81E2C] focus:border-transparent transition-shadow"
          />
          <button onClick={submitScore} className={`w-full px-6 py-3 ${BTN_PRIMARY}`}>
            Guardar y volver al menú
          </button>
        </div>
      </div>
    );
  }

  // =====================================================================
  // PANTALLA: MENÚ
  // =====================================================================
  if (screen === "menu") {
    return (
      <div className={`${fontVars} font-[family-name:var(--font-body)] flex flex-col justify-center items-center min-h-screen p-6 text-center ${BRAND_BACKDROP}`}>
        <div className="relative flex flex-col items-center animate-[fadeUp_0.6s_ease-out]">
          <img
            src="logo-caja.webp"
            alt="Caja Huancayo"
            className="w-full max-w-[180px] h-auto mb-8 drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
          />

          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 px-4 py-1.5 text-xs font-semibold tracking-wide text-white mb-5 backdrop-blur-sm">
            <IconBulb className="w-3.5 h-3.5" />
            Reto de palabras
          </span>

          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-3 max-w-md">
            Ahorcado financiero
          </h1>
          <p className="text-white/75 max-w-xs mb-10">
            Adivina las palabras antes de que se acabe el tiempo. Aprende finanzas jugando.
          </p>

          <button
            onClick={startGame}
            className="group inline-flex items-center gap-2 bg-white hover:bg-[#FFF5F5] active:scale-[0.98] px-8 py-3.5 rounded-full text-[#7A0F1C] font-bold text-lg shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-200"
          >
            <IconPlay className="w-5 h-5 text-[#C81E2C] group-hover:translate-x-0.5 transition-transform" />
            Iniciar juego
          </button>

          <div className="flex items-center gap-6 mt-6">
            <button
              onClick={() => setScreen("ranking")}
              className="text-white/80 hover:text-white text-sm font-medium underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors"
            >
              Ver ranking
            </button>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              {isFullscreen ? <IconCollapse /> : <IconExpand />}
              {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-\\[fadeUp_0\\.6s_ease-out\\] { animation: none; }
          }
        `}</style>
      </div>
    );
  }

  // =====================================================================
  // PANTALLA: RANKING
  // =====================================================================
  if (screen === "ranking") {
    const podium = ranking.slice(0, 3);
    const rest = ranking.slice(3);
    const podiumStyles = [
      "order-2 bg-gradient-to-b from-white to-[#FFE5E5] text-[#7A0F1C] h-28 border border-[#C81E2C]/20",
      "order-1 bg-gradient-to-b from-[#FFF5F5] to-[#FFD9D9] text-[#7A0F1C] h-24 border border-[#C81E2C]/15",
      "order-3 bg-gradient-to-b from-[#FFD9D9] to-[#FFB3B3] text-[#7A0F1C] h-20 border border-[#C81E2C]/15",
    ];

    return (
      <div className={`${fontVars} font-[family-name:var(--font-body)] min-h-screen p-6 flex flex-col items-center ${BRAND_BACKDROP}`}>
        <div className="relative w-full max-w-md flex flex-col items-center pt-4">
          <IconTrophy className="w-10 h-10 text-white mb-2" />
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white mb-8">Ranking local</h1>

          {ranking.length === 0 ? (
            <div className="w-full rounded-2xl bg-white/10 border border-white/20 p-8 text-center backdrop-blur-sm">
              <p className="text-white/85">Aún no hay puntajes. ¡Sé el primero en jugar!</p>
            </div>
          ) : (
            <>
              {podium.length > 0 && (
                <div className="flex items-end justify-center gap-3 w-full mb-6">
                  {podium.map((r, i) => (
                    <div key={`${r.name}-${i}`} className={`flex-1 flex flex-col items-center rounded-t-2xl px-2 pt-3 pb-2 shadow-lg ${podiumStyles[i]}`}>
                      <span className="text-xs font-bold opacity-70">#{i + 1}</span>
                      <span className="font-semibold text-sm truncate w-full text-center">{r.name}</span>
                      <span className="font-[family-name:var(--font-display)] font-bold">{r.score}</span>
                    </div>
                  ))}
                </div>
              )}

              {rest.length > 0 && (
                <ul className="w-full rounded-2xl bg-white shadow-xl overflow-hidden divide-y divide-black/5">
                  {rest.map((r, i) => (
                    <li key={`${r.name}-${i}`} className="flex items-center justify-between px-4 py-3 text-[#1A0A0D]">
                      <span className="text-sm font-semibold text-[#C81E2C] w-6">#{i + 4}</span>
                      <span className="flex-1 truncate text-sm font-medium">{r.name}</span>
                      <span className="font-[family-name:var(--font-display)] font-bold text-sm">{r.score} pts</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <button onClick={() => setScreen("menu")} className={`mt-8 px-6 py-2.5 text-sm ${BTN_GHOST_LIGHT}`}>
            <IconExit className="w-4 h-4 rotate-180" />
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  // =====================================================================
  // PANTALLA: NIVEL COMPLETADO
  // =====================================================================
  if (screen === "levelcomplete") {
    return (
      <div className={`${fontVars} font-[family-name:var(--font-body)] flex flex-col justify-center items-center min-h-screen p-6 text-center ${BRAND_BACKDROP}`}>
        <div className={`w-full max-w-sm p-8 ${CARD_SURFACE}`}>
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[#FFE5E5] flex items-center justify-center">
            <IconTrophy className="w-8 h-8 text-[#C81E2C]" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#1A0A0D] mb-2">
            ¡Nivel {level} completado!
          </h1>
          <p className="text-[#7A0F1C]/70 mb-6 text-sm">
            Acertaste {wordsCompleted} palabras. Prepárate para el siguiente nivel.
          </p>
          <div className="bg-[#FFF5F5] rounded-xl p-4 mb-6">
            <p className="text-xs text-[#7A0F1C]/70 mb-1">Puntaje acumulado</p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[#C81E2C]">
              {score}
            </p>
          </div>
          <button onClick={goToNextLevel} className={`w-full px-6 py-3 ${BTN_PRIMARY}`}>
            Siguiente nivel
          </button>
        </div>
      </div>
    );
  }

  // =====================================================================
  // PANTALLA: GAME OVER
  // =====================================================================
  if (screen === "gameover") {
    return (
      <div className={`${fontVars} font-[family-name:var(--font-body)] flex flex-col justify-center items-center min-h-screen p-6 text-center ${BRAND_BACKDROP}`}>
        <div className={`w-full max-w-sm p-8 ${CARD_SURFACE}`}>
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[#FFE5E5] flex items-center justify-center">
            <IconTrophy className="w-7 h-7 text-[#C81E2C]" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#1A0A0D] mb-2">
            {level >= MAX_LEVEL ? "¡Completaste el reto!" : "Se acabó el tiempo"}
          </h1>
          <p className="text-[#7A0F1C]/70 mb-1">Puntaje final</p>
          <p className="font-[family-name:var(--font-display)] text-5xl font-extrabold text-[#C81E2C] mb-8">{score}</p>

          <button onClick={resetGame} className={`w-full px-6 py-3 mb-3 ${BTN_PRIMARY}`}>
            Guardar puntaje
          </button>
          <button
            onClick={() => setScreen("menu")}
            className="w-full text-[#7A0F1C] hover:text-[#C81E2C] px-6 py-2 text-sm font-semibold transition-colors"
          >
            Volver al menú principal
          </button>
        </div>
      </div>
    );
  }

  // =====================================================================
  // PANTALLA: JUEGO
  // =====================================================================
  return (
    <div className={`${fontVars} font-[family-name:var(--font-body)] flex flex-col items-center min-h-screen p-4 sm:p-6 ${BRAND_BACKDROP}`}>
      {/* HUD superior */}
      <div className="relative w-full max-w-3xl flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-display)] text-white/60 text-sm font-semibold">Nivel</span>
          <span className="font-[family-name:var(--font-display)] text-white text-2xl font-extrabold">{level}</span>
          <span className="text-white/40 text-sm">/ {MAX_LEVEL}</span>
          <span className="text-white/40 text-sm ml-2">
            · Palabra {wordIndex + 1}/{roundWords.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Vidas */}
          <div className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm px-3 py-1.5">
            {Array.from({ length: MAX_ERRORS }).map((_, i) => (
              <IconHeart
                key={i}
                className={`w-4 h-4 transition-all duration-300 ${
                  i < MAX_ERRORS - errors ? "text-[#FF6B7A]" : "text-white/20"
                }`}
              />
            ))}
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
              isLowTime ? "bg-white text-[#C81E2C] animate-pulse" : "bg-white/15 text-white border border-white/25 backdrop-blur-sm"
            }`}
          >
            <IconClock className="w-4 h-4" />
            {timeLeft}s
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm px-3.5 py-1.5 text-sm font-bold text-white">
            <IconStar className="w-4 h-4" />
            {score}
          </div>

          <button
            onClick={() => {
              setTimerPaused(true);
              setShowExitConfirm(true);
            }}
            aria-label="Salir del juego"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white transition-colors"
          >
            <IconExit className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tarjeta principal del juego */}
      <div className={`w-full max-w-3xl p-6 sm:p-8 ${CARD_SURFACE}`}>
        <div className="grid md:grid-cols-[260px_1fr] gap-6 items-center">
          {/* Dibujo del ahorcado */}
          <div className="relative flex justify-center">
            <div className="w-full max-w-[220px] p-3 rounded-2xl bg-[#FFF5F5] border border-[#C81E2C]/10">
              <HangmanDrawing errors={errors} />
            </div>
          </div>

          {/* Información de la palabra */}
          <div className="flex flex-col items-center md:items-start">
            {/* Categoría y pista */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE5E5] px-3 py-1 text-xs font-semibold text-[#C81E2C]">
                {currentEntry?.category ?? ""}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF5F5] border border-[#C81E2C]/15 px-3 py-1 text-xs font-medium text-[#7A0F1C]">
                <IconBulb className="w-3.5 h-3.5" />
                {currentEntry?.hint ?? ""}
              </span>
            </div>

            {/* Palabra con guiones */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
              {wordLetters.map((letter, i) => {
                const revealed = guessed.has(letter);
                const isCorrectReveal = revealed && currentEntry?.word.includes(letter);
                return (
                  <div
                    key={i}
                    className={`w-9 h-11 sm:w-10 sm:h-12 rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold transition-all duration-300 ${
                      revealed
                        ? isCorrectReveal
                          ? "bg-[#C81E2C] text-white shadow-md shadow-[#C81E2C]/30"
                          : "bg-[#FFE5E5] text-[#C81E2C]"
                        : "bg-[#FFF5F5] border-2 border-dashed border-[#C81E2C]/25 text-transparent"
                    }`}
                    aria-label={revealed ? letter : "Letra oculta"}
                  >
                    {revealed ? letter : "·"}
                  </div>
                );
              })}
            </div>

            {/* Pista (revelar letra) */}
            <button
              onClick={revealHint}
              disabled={usedHint || !active}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                usedHint
                  ? "bg-black/5 text-black/30 cursor-not-allowed"
                  : "bg-[#FFF5F5] border border-[#C81E2C]/20 text-[#C81E2C] hover:bg-[#FFE5E5]"
              }`}
            >
              <IconBulb className="w-3.5 h-3.5" />
              {usedHint ? "Pista usada (-30 pts)" : "Usar pista"}
            </button>
          </div>
        </div>

        {/* Teclado virtual */}
        <div className="mt-8 grid grid-cols-7 sm:grid-cols-9 gap-1.5 sm:gap-2">
          {ALPHABET.map((letter) => {
            const isUsed = guessed.has(letter);
            const isCorrect = isUsed && currentEntry?.word.includes(letter);
            const isWrong = isUsed && !isCorrect;
            return (
              <button
                key={letter}
                onClick={() => handleGuess(letter)}
                disabled={isUsed || !active || timerPaused}
                className={`aspect-square rounded-lg font-[family-name:var(--font-display)] font-bold text-sm sm:text-base transition-all duration-200 ${
                  isCorrect
                    ? "bg-[#C81E2C] text-white shadow-md shadow-[#C81E2C]/30"
                    : isWrong
                    ? "bg-black/5 text-black/25 line-through"
                    : "bg-[#FFF5F5] hover:bg-[#FFE5E5] text-[#7A0F1C] border border-[#C81E2C]/10 hover:border-[#C81E2C]/30 active:scale-95"
                } disabled:cursor-not-allowed`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      <img src="logo-caja.webp" alt="Caja Huancayo" className="max-w-[130px] h-auto mt-6 opacity-90" />

      {/* Modal: confirmar salida */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-7 rounded-2xl max-w-sm w-full shadow-2xl border border-black/5">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#1A0A0D] mb-2">
              ¿Salir del juego?
            </h3>
            <p className="text-[#7A0F1C]/70 mb-6 text-sm">Perderás tu progreso en este nivel.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  setTimerPaused(false);
                }}
                className="px-4 py-2 rounded-xl border border-black/10 text-[#1A0A0D] font-medium hover:bg-black/5 transition-colors"
              >
                Cancelar
              </button>
              <button onClick={exitToMenu} className={`px-4 py-2 ${BTN_PRIMARY}`}>
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes drawIn {
          from { opacity: 0; stroke-dasharray: 200; stroke-dashoffset: 200; }
          to { opacity: 1; stroke-dasharray: 200; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}