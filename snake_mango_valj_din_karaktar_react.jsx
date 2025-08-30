import React, { useEffect, useRef, useState } from "react";

// Snake Mango – välj din karaktär
// Körs som en React-komponent. Piltangenter eller WASD för att styra.
// Klick/touch på knapparna funkar på mobil.

const CHARACTERS = [
  "🐍", "🐸", "🐱", "🐼", "🐹", "🐵", "🦊", "🦄", "🚗", "🛸", "🌟"
];

const MANGO = "🥭";

const GRID_COLS = 24;
const GRID_ROWS = 18;
const TILE = 32; // px

function randInt(max) { return Math.floor(Math.random() * max); }

function useAnimationFrame(callback) {
  const requestRef = useRef();
  const previousTimeRef = useRef();

  useEffect(() => {
    const animate = (time) => {
      if (previousTimeRef.current !== undefined) {
        const delta = time - previousTimeRef.current;
        callback(delta);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [callback]);
}

export default function SnakeMangoGame() {
  const canvasRef = useRef(null);
  const [selectedChar, setSelectedChar] = useState("🐍");
  const [snake, setSnake] = useState([{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }]);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [pendingDir, setPendingDir] = useState({ x: 1, y: 0 });
  const [food, setFood] = useState({ x: 12, y: 9 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tickEveryMs, setTickEveryMs] = useState(150);
  const accRef = useRef(0);

  // Init highscore from localStorage
  useEffect(() => {
    const hs = Number(localStorage.getItem("snake_mango_highscore") || 0);
    if (!Number.isNaN(hs)) setHighScore(hs);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) return queueDir(0, -1);
      if (["arrowdown", "s"].includes(key)) return queueDir(0, 1);
      if (["arrowleft", "a"].includes(key)) return queueDir(-1, 0);
      if (["arrowright", "d"].includes(key)) return queueDir(1, 0);
      if (key === " " || key === "enter") return togglePause();
      if (key === "r") return reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dir, gameOver, paused]);

  function queueDir(x, y) {
    if (gameOver) return;
    // prevent reversing into yourself
    if (x === -dir.x && y === -dir.y) return;
    setPendingDir({ x, y });
  }

  function togglePause() {
    if (gameOver) return;
    setPaused(p => !p);
  }

  function reset() {
    setSnake([{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }]);
    setDir({ x: 1, y: 0 });
    setPendingDir({ x: 1, y: 0 });
    setFood(spawnFood([{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }]));
    setScore(0);
    setGameOver(false);
    setPaused(false);
    setTickEveryMs(150);
    accRef.current = 0;
  }

  function spawnFood(occupied) {
    while (true) {
      const p = { x: randInt(GRID_COLS), y: randInt(GRID_ROWS) };
      if (!occupied.some(s => s.x === p.x && s.y === p.y)) return p;
    }
  }

  // Game loop timing
  useAnimationFrame((delta) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Draw background grid each frame for smoothness
    draw(ctx);

    if (paused || gameOver) return;

    accRef.current += delta;
    if (accRef.current >= tickEveryMs) {
      accRef.current = 0;
      tick();
    }
  });

  function tick() {
    // apply queued dir at the start of a tick
    setDir(pendingDir);

    setSnake((prev) => {
      const head = { x: prev[0].x + pendingDir.x, y: prev[0].y + pendingDir.y };

      // collisions with walls
      if (head.x < 0 || head.y < 0 || head.x >= GRID_COLS || head.y >= GRID_ROWS) {
        setGameOver(true);
        return prev;
      }
      // collisions with self
      if (prev.some(seg => seg.x === head.x && seg.y === head.y)) {
        setGameOver(true);
        return prev;
      }

      const ate = (head.x === food.x && head.y === food.y);
      const next = [head, ...prev];
      if (!ate) next.pop();

      if (ate) {
        const newScore = score + 1;
        setScore(newScore);
        // speed up very slightly, but clamp
        setTickEveryMs((ms) => Math.max(70, ms - 4));
        const nextFood = spawnFood(next);
        setFood(nextFood);
        // fun lil vibration on supported devices
        if (navigator.vibrate) navigator.vibrate(10);
      }

      return next;
    });
  }

  function draw(ctx) {
    const W = GRID_COLS * TILE;
    const H = GRID_ROWS * TILE;

    // crisp rendering
    ctx.canvas.width = W;
    ctx.canvas.height = H;

    // background
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#ffffff";
    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE, 0);
      ctx.lineTo(x * TILE, H);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE);
      ctx.lineTo(W, y * TILE);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // draw food (mango) as emoji
    ctx.font = `${Math.floor(TILE * 0.9)}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(MANGO, food.x * TILE + TILE / 2, food.y * TILE + TILE / 2);

    // draw snake segments
    const bodyEmoji = selectedChar;
    snake.forEach((seg, i) => {
      const emoji = bodyEmoji;
      ctx.fillText(emoji, seg.x * TILE + TILE / 2, seg.y * TILE + TILE / 2);
    });

    // overlays
    if (paused) overlay(ctx, "Pausad – tryck SPACE för att fortsätta");
    if (gameOver) overlay(ctx, `Game Over – poäng ${score}. Tryck R för att starta om`);
  }

  function overlay(ctx, text) {
    const W = GRID_COLS * TILE;
    const H = GRID_ROWS * TILE;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.floor(TILE * 0.7)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, W / 2, H / 2);
    ctx.restore();
  }

  // update highscore when score changes or game ends
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("snake_mango_highscore", String(score));
    }
  }, [score]);

  // UI rendering
  const sizeStyle = { width: GRID_COLS * TILE, height: GRID_ROWS * TILE };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-fit">
        <h1 className="text-2xl md:text-3xl font-bold mb-3 text-center">Snake Mango 🥭 – välj din karaktär</h1>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="opacity-80">Karaktär:</span>
            <div className="flex flex-wrap gap-2">
              {CHARACTERS.map(ch => (
                <button
                  key={ch}
                  onClick={() => setSelectedChar(ch)}
                  className={`px-2 py-1 rounded-2xl border transition shadow ${selectedChar === ch ? "bg-emerald-500/20 border-emerald-400" : "bg-slate-800 border-slate-700 hover:bg-slate-700"}`}
                  title={`Spela som ${ch}`}
                >{ch}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">Poäng: <b>{score}</b></div>
            <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">Rekord: <b>{highScore}</b></div>
            <button onClick={togglePause} className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition shadow">{paused ? "Fortsätt" : "Pausa"}</button>
            <button onClick={reset} className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 transition shadow">Starta om</button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden ring-1 ring-slate-700 shadow-2xl" style={sizeStyle}>
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 md:hidden select-none">
          {/* Mobile controls */}
          <button onClick={() => queueDir(0, -1)} className="col-span-4 py-2 rounded-xl bg-slate-800 active:scale-95 border border-slate-700">⬆️</button>
          <button onClick={() => queueDir(-1, 0)} className="py-2 rounded-xl bg-slate-800 active:scale-95 border border-slate-700">⬅️</button>
          <button onClick={() => queueDir(1, 0)} className="py-2 rounded-xl bg-slate-800 active:scale-95 border border-slate-700">➡️</button>
          <button onClick={() => queueDir(0, 1)} className="col-span-4 py-2 rounded-xl bg-slate-800 active:scale-95 border border-slate-700">⬇️</button>
        </div>

        <p className="mt-4 text-sm opacity-70 text-center">Styr med piltangenter eller WASD • SPACE för paus • R för att starta om • Ät {MANGO} för poäng (spelet blir snabbare!)</p>
      </div>
    </div>
  );
}
