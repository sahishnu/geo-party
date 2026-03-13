import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import Board from "../components/Board";
import PlayerCard from "../components/PlayerCard";
import EventLogFeed from "../components/EventLogFeed";
import { useGameConfig } from "../hooks/useGameConfig";
import { useTeams } from "../hooks/useTeams";
import { useTiles } from "../hooks/useTiles";
import { useEvents } from "../hooks/useEvents";
import { useMoveAnimation } from "../hooks/useMoveAnimation";
import { getCameraTransform } from "../utils/cameraTransform";
import { supabase } from "../lib/supabase";
import type { Team } from "../types/database";

type ActiveActivity = {
  title: string;
  color: string;
  game_mode: string;
  duration?: number | null;
};

function FlipCard({
  backLabel,
  backSubtitle,
  bgColor,
  borderColor,
  frontLabel,
  frontSubtitle,
  onDismiss,
}: {
  backLabel: string;
  backSubtitle: string;
  bgColor: string;
  borderColor: string;
  frontLabel: string;
  frontSubtitle: string;
  onDismiss: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  // useEffect(() => {
  //   const timer = setTimeout(() => setFlipped(true), 1200);
  //   return () => clearTimeout(timer);
  // }, []);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      style={{ perspective: "1200px" }}
      onClick={() => {
        if (flipped) onDismiss();
        else setFlipped(true);
      }}
    >
      <motion.div
        className="relative"
        style={{
          width: "min(320px, 85vw)",
          aspectRatio: "2.5 / 3.5",
          transformStyle: "preserve-3d",
        }}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Back face (shown first) */}
        <div
          className="rounded-2xl border-4 shadow-2xl absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{
            backgroundColor: "#FAFAF8",
            borderColor: 'white',
            backfaceVisibility: "hidden",
          }}
        >
          {/* Decorative diamond pattern */}
          <div
            className="absolute inset-4 rounded-xl border-[12px] opacity-100"
            style={{ borderColor: bgColor }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-[0.06]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                ${bgColor} 0px,
                ${bgColor} 1px,
                transparent 1px,
                transparent 12px
              ),
              repeating-linear-gradient(
                -45deg,
                ${bgColor} 0px,
                ${bgColor} 1px,
                transparent 1px,
                transparent 12px
              )`,
            }}
          />
          <div className="relative z-10 text-center flex flex-col items-center justify-between h-full my-8">
            <div
              className="text-xl font-bold uppercase tracking-[0.25em] -scale-100"
              style={{ color: bgColor }}
            >
              {backSubtitle}
            </div>
            <div className="text-7xl mb-3">{backLabel}</div>
            <div
              className="text-xl font-bold uppercase tracking-[0.25em]"
              style={{ color: bgColor }}
            >
              {backSubtitle}
            </div>
          </div>
        </div>

        {/* Front face (revealed after flip) */}
        <div
          className="rounded-2xl border-8 shadow-2xl absolute inset-0 flex flex-col items-center justify-center px-8"
          style={{
            backgroundColor: 'white',
            borderColor,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Top color strip */}
          {/* <div
            className="absolute top-0 left-0 right-0 h-5 rounded-t-xl"
            style={{ backgroundColor: bgColor }}
          /> */}
          <div
            className="text-xs font-bold uppercase tracking-[0.25em] mb-4"
            style={{ color: bgColor }}
          >
            {frontSubtitle}
          </div>
          <div
            className="text-3xl font-bold leading-snug text-center"
            style={{ color: "#1a1a2e" }}
          >
            {frontLabel}
          </div>
          {/* Bottom color strip */}
          {/* <div
            className="absolute bottom-0 left-0 right-0 h-5"
            style={{ backgroundColor: bgColor }}
          /> */}
        </div>
      </motion.div>
    </div>
  );
}

export default function BoardView() {
  const { config, loading: configLoading } = useGameConfig();
  const { teams } = useTeams();
  const { tiles } = useTiles();
  const { events } = useEvents(50);
  const [connected, setConnected] = useState(true);
  const [activeActivity, setActiveActivity] = useState<ActiveActivity | null>(null);
  const [revealedCard, setRevealedCard] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const { animatingTeam, currentPosition, isAnimating } = useMoveAnimation(events, teams, config);

  // Confetti: track which event IDs we've already processed
  const seenEventIdsRef = useRef(new Set<string>());
  const confettiInitialized = useRef(false);

  useEffect(() => {
    const channel = supabase.channel("connection_check").subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('activity_display')
      .on('broadcast', { event: 'show_activity' }, ({ payload }) => {
        setActiveActivity(payload);
        setTimeLeft(payload.duration ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('card_display')
      .on('broadcast', { event: 'show_card' }, ({ payload }) => {
        setRevealedCard(payload.content);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Confetti on pot_claim events
  useEffect(() => {
    if (!confettiInitialized.current) {
      if (events.length > 0) {
        events.forEach(e => seenEventIdsRef.current.add(e.id));
        confettiInitialized.current = true;
      }
      return;
    }
    for (const event of events) {
      if (!seenEventIdsRef.current.has(event.id)) {
        seenEventIdsRef.current.add(event.id);
        if (event.event_type === 'pot_claim') {
          confetti({ particleCount: 220, spread: 100, origin: { y: 0.5 }, startVelocity: 45 });
          setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { x: 0.1, y: 0.6 } }), 300);
          setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { x: 0.9, y: 0.6 } }), 500);
        }
      }
    }
  }, [events]);

  // Activity countdown tick
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  // Auto-close activity 2s after timer hits 0
  useEffect(() => {
    if (timeLeft !== 0) return;
    const t = setTimeout(() => {
      setActiveActivity(null);
      setTimeLeft(null);
    }, 2000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  if (configLoading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAFAF8" }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🎲</div>
          <p className="text-gray-500 font-semibold">Loading game...</p>
        </div>
      </div>
    );
  }

  const sortedByTurnOrder = [...teams].sort((a, b) => a.turn_order - b.turn_order);
  const sortedByScore = [...teams].sort((a, b) => b.score - a.score);
  const teamMap = new Map<string, Team>(teams.map((t) => [t.id, t]));
  const scoreRankMap = new Map<string, number>();
  let currentRank = 1;
  for (let i = 0; i < sortedByScore.length; i++) {
    if (i > 0 && sortedByScore[i].score < sortedByScore[i - 1].score) currentRank = i + 1;
    scoreRankMap.set(sortedByScore[i].id, currentRank);
  }

  const n = config.tiles_per_side;
  const tileSize = Math.min(
    Math.floor((window.innerWidth * 0.97) / n),
    Math.floor((window.innerHeight * 0.80) / n),
    140
  );
  const boardPx = n * tileSize;
  const camera = getCameraTransform(isAnimating ? currentPosition : null, n, tileSize, boardPx);

  const activityDuration = activeActivity?.duration ?? null;
  const timerPercent = activityDuration && timeLeft !== null
    ? Math.max(0, timeLeft / activityDuration)
    : null;
  const isTimeUp = timeLeft === 0;

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: "#FAFAF8",
        backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      {/* Reconnecting banner */}
      {!connected && (
        <div className="bg-amber-400 text-amber-900 text-xs text-center py-1 px-4 font-semibold shrink-0">
          Reconnecting to server...
        </div>
      )}

      {/* ── Player Card Strip ── */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 flex-wrap shrink-0">
        {sortedByTurnOrder.map((team) => (
          <PlayerCard
            key={team.id}
            team={team}
            isCurrentTurn={team.id === config.current_team_id}
            rank={scoreRankMap.get(team.id)}
          />
        ))}

        {/* Pot card — inline, same size as player cards */}
        <div
          className="border border-amber-300 relative flex items-center gap-3 rounded-2xl px-8 py-3 shadow-md"
          style={{
            background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
            boxShadow:
              config.pot_total > 0
                ? "0 0 12px rgba(245, 158, 11, 0.3), 0 2px 8px rgba(0,0,0,0.08)"
                : "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <span className="text-3xl">🪙</span>
          <div className="min-w-0">
            <div className="font-extrabold text-amber-700 truncate text-md leading-tight">
              Pot
            </div>
            <div className="font-extrabold text-2xl leading-tight tabular-nums text-amber-600">
              {config.pot_total.toLocaleString()}
              <span className="text-xs font-semibold text-amber-400 ml-1">pts</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Board + Event Log ── */}
      <div className="flex flex-1 gap-4 px-5 overflow-hidden min-h-0">
        {/* Board area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {tiles.length > 0 ? (
            <motion.div
              animate={{ x: camera.x, y: camera.y, scale: camera.scale }}
              transition={{ type: "spring", stiffness: 150, damping: 35 }}
            >
              <Board
                tiles={tiles}
                teams={teams}
                config={config}
                animatingTeamId={animatingTeam?.id}
                animatingTeam={animatingTeam ?? undefined}
                animationPosition={currentPosition}
              />
            </motion.div>
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-5xl mb-4">🗺️</p>
              <p className="text-lg font-bold text-gray-500">No board yet</p>
              <p className="text-sm mt-1">Go to Admin → Board tab to set up the board.</p>
            </div>
          )}
        </div>

        {/* Event Log feed */}
        <div className="w-72 shrink-0 bg-white/70 backdrop-blur-sm rounded-2xl mb-4 px-4 py-4 shadow-sm overflow-hidden flex flex-col">
          <EventLogFeed events={events} teamMap={teamMap} />
        </div>
      </div>

      {/* ── Card overlay ── */}
      {revealedCard && (
        <FlipCard
          backLabel="❓"
          backSubtitle="Chance Card"
          bgColor="#4338CA"
          borderColor="#818CF8"
          frontLabel={revealedCard}
          frontSubtitle="Chance Card"
          onDismiss={() => setRevealedCard(null)}
        />
      )}

      {/* ── Activity overlay ── */}
      {activeActivity && (
        <FlipCard
          backLabel="⚡"
          backSubtitle={activeActivity.game_mode.replace(/_/g, ' ')}
          bgColor={activeActivity.color}
          borderColor={activeActivity.color + 'AA'}
          frontLabel={activeActivity.title}
          frontSubtitle={activeActivity.game_mode.replace(/_/g, ' ')}
          onDismiss={() => { setActiveActivity(null); setTimeLeft(null); }}
        />
      )}

      {/* ── Activity countdown timer (floats above FlipCard) ── */}
      {activeActivity && activityDuration && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div
            className="rounded-2xl px-8 py-4 text-center shadow-2xl min-w-48"
            style={{ backgroundColor: activeActivity.color + 'EE', border: `3px solid ${activeActivity.color}` }}
          >
            {isTimeUp ? (
              <div className="text-3xl font-extrabold text-white animate-pulse">TIME'S UP!</div>
            ) : (
              <>
                <div className="text-5xl font-extrabold text-white tabular-nums leading-none mb-2">
                  {timeLeft}
                </div>
                <div className="h-2.5 rounded-full bg-black/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white/80 transition-all duration-1000 ease-linear"
                    style={{ width: `${(timerPercent ?? 1) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
