import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import Board from "../components/Board";
import PlayerCard from "../components/PlayerCard";
import { useGameConfig } from "../hooks/useGameConfig";
import { useTeams } from "../hooks/useTeams";
import { useTiles } from "../hooks/useTiles";
import { useEvents } from "../hooks/useEvents";
import { useMoveAnimation } from "../hooks/useMoveAnimation";
import { getCameraTransform } from "../utils/cameraTransform";
import { supabase } from "../lib/supabase";
import { getTeamColor } from "../utils/teamColors";
import type { Team, GameEvent } from "../types/database";

type ActiveActivity = {
  title: string;
  color: string;
  game_mode: string;
};

function FlipCard({
  backLabel,
  backSubtitle,
  bgColor,
  borderColor,
  frontEmoji,
  frontLabel,
  frontTitle,
  frontSubtitle,
  onDismiss,
}: {
  backLabel: string;
  backSubtitle: string;
  bgColor: string;
  borderColor: string;
  frontEmoji?: string;
  frontLabel: string;
  frontTitle?: string;
  frontSubtitle: string;
  onDismiss: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), 1200);
    return () => clearTimeout(timer);
  }, []);

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
          width: "min(400px, 90vw)",
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
              className="text-2xl font-bold uppercase tracking-[0.25em] -scale-100"
              style={{ color: bgColor }}
            >
              {backSubtitle}
            </div>
            <div className="text-8xl mb-3">{backLabel}</div>
            <div
              className="text-2xl font-bold uppercase tracking-[0.25em]"
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
            className="text-sm font-bold uppercase tracking-[0.25em] mb-4"
            style={{ color: bgColor }}
          >
            {frontSubtitle}
          </div>
          {frontEmoji && (
            <div className="text-8xl mb-3">{frontEmoji}</div>
          )}
          {frontTitle && (
            <div
              className="text-3xl font-extrabold text-center mb-3"
              style={{ color: bgColor }}
            >
              {frontTitle}
            </div>
          )}
          <div
            className={`font-bold leading-snug text-center ${frontTitle ? 'text-2xl' : 'text-4xl'}`}
            style={{ color: "#1a1a2e" }}
          >
            {frontLabel}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatEventMessage(event: GameEvent): string {
  switch (event.event_type) {
    case "move":
      if (event.notes?.startsWith('Positions shuffled')) return 'shuffled its position';
      if (event.notes?.startsWith('Position swapped')) return event.notes;
      if (event.notes?.startsWith('Sent to')) return event.notes;
      return `moved ${event.spaces_moved} spaces to "${event.tile_label}"`;
    case "score_change":
      return `${(event.points_delta ?? 0) >= 0 ? "+" : ""}${event.points_delta} pts${event.notes ? ` (${event.notes})` : ""}`;
    case "pot_claim":
      return `claimed the pot! 🎉`;
    case "pot_contribution":
      return `added ${Math.abs(event.points_delta ?? 0)} pts to pot`;
    case "card_reveal":
      return `card: ${event.notes}`;
    default:
      return event.notes ?? "";
  }
}

export default function BoardView() {
  const { config, loading: configLoading } = useGameConfig();
  const { teams } = useTeams();
  const { tiles } = useTiles();
  const { events } = useEvents(50);
  const [connected, setConnected] = useState(true);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState<ActiveActivity | null>(null);
  const [revealedCard, setRevealedCard] = useState<{ title: string; content: string; emoji: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerTotal, setTimerTotal] = useState<number | null>(null);
  const { animatingTeam, currentPosition, isAnimating } = useMoveAnimation(events, teams, config);

  // Track which event IDs we've already processed (confetti + toasts)
  const seenEventIdsRef = useRef(new Set<string>());
  const confettiInitialized = useRef(false);
  const teamMap = new Map<string, Team>(teams.map((t) => [t.id, t]));

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
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('card_display')
      .on('broadcast', { event: 'show_card' }, ({ payload }) => {
        setRevealedCard({ title: payload.title ?? '', content: payload.content, emoji: payload.emoji ?? '❓' });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('timer_control')
      .on('broadcast', { event: 'timer_start' }, ({ payload }) => {
        setTimeLeft(payload.duration);
        setTimerTotal(payload.duration);
        setTimerPaused(false);
      })
      .on('broadcast', { event: 'timer_pause' }, () => setTimerPaused(true))
      .on('broadcast', { event: 'timer_resume' }, () => setTimerPaused(false))
      .on('broadcast', { event: 'timer_stop' }, () => {
        setTimeLeft(null);
        setTimerTotal(null);
        setTimerPaused(false);
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

  // Toast notifications for new events
  useEffect(() => {
    if (!confettiInitialized.current) return;
    for (const event of events) {
      if (seenEventIdsRef.current.has(event.id)) continue;
      const team = event.team_id ? teamMap.get(event.team_id) : undefined;
      const teamName = team?.name ?? "Unknown";
      const message = formatEventMessage(event);
      const color = team ? getTeamColor(team.turn_order) : "#6B7280";

      toast(
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0 border-2 border-white shadow"
            style={{ backgroundColor: color }}
          >
            {team?.icon ?? "🎲"}
          </span>
          <span>
            <span className="font-bold">{teamName}</span>{" "}
            <span className="text-gray-600">{message}</span>
          </span>
        </div>,
        { duration: 4000 },
      );
    }
  }, [events]);

  // Countdown tick — pauses when timerPaused is true
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || timerPaused) return;
    const t = setTimeout(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, timerPaused]);

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
  const scoreRankMap = new Map<string, number>();
  let currentRank = 1;
  for (let i = 0; i < sortedByScore.length; i++) {
    if (i > 0 && sortedByScore[i].score < sortedByScore[i - 1].score) currentRank = i + 1;
    scoreRankMap.set(sortedByScore[i].id, currentRank);
  }

  const n = config.tiles_per_side;
  const tileSize = Math.min(
    Math.floor((window.innerWidth * 1.0) / n),
    Math.floor((window.innerHeight * 1.0) / n),
    220
  );
  const boardPx = n * tileSize;
  const camera = getCameraTransform(isAnimating ? currentPosition : null, n, tileSize, boardPx);

  const timerPercent = timerTotal && timeLeft !== null
    ? Math.max(0, timeLeft / timerTotal)
    : 1;
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

      {/* Demo affordance: this is a single-host game — the admin panel drives it
          from another window. Subtle so it doesn't intrude on a projector view. */}
      <a
        href="/admin"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-3 left-3 z-50 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-800"
      >
        Open admin ↗
      </a>

      {/* ── Board + Player List ── */}
      <div className="flex flex-1 gap-4 px-5 pt-4 overflow-hidden min-h-0">
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
                hoveredTeamId={hoveredTeamId}
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

        {/* Player list sidebar */}
        <div className="flex flex-col justify-center gap-5 shrink-0 overflow-y-auto py-4 px-4 -mr-4">
          {sortedByTurnOrder.map((team) => (
            <PlayerCard
              key={team.id}
              team={team}
              isCurrentTurn={team.id === config.current_team_id}
              rank={scoreRankMap.get(team.id)}
              onHover={setHoveredTeamId}
            />
          ))}
        </div>
      </div>

      {/* ── Card overlay ── */}
      {revealedCard && (
        <FlipCard
          backLabel="❓"
          backSubtitle="Chance Card"
          bgColor="#4338CA"
          borderColor="#818CF8"
          frontEmoji={revealedCard.emoji}
          frontLabel={revealedCard.content}
          frontTitle={revealedCard.title || undefined}
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
          onDismiss={() => setActiveActivity(null)}
        />
      )}

      {/* ── Countdown timer (independent of activities) ── */}
      {timeLeft !== null && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="rounded-2xl px-8 py-4 text-center shadow-2xl min-w-48 bg-gray-900/95 border-2 border-white/20">
            {isTimeUp ? (
              <div className="text-3xl font-extrabold text-white animate-pulse">TIME'S UP!</div>
            ) : (
              <>
                <div className={`text-5xl font-extrabold tabular-nums leading-none mb-2 ${timerPaused ? 'text-yellow-300' : 'text-white'}`}>
                  {timerPaused ? '⏸' : timeLeft}
                </div>
                {!timerPaused && (
                  <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/80 transition-all duration-1000 ease-linear"
                      style={{ width: `${timerPercent * 100}%` }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
