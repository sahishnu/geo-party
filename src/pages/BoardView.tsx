import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

export default function BoardView() {
  const { config, loading: configLoading } = useGameConfig();
  const { teams } = useTeams();
  const { tiles } = useTiles();
  const { events } = useEvents(50);
  const [connected, setConnected] = useState(true);
  const [activeActivity, setActiveActivity] = useState<{ title: string; color: string; game_mode: string } | null>(null);
  const [revealedCard, setRevealedCard] = useState<string | null>(null);
  const { animatingTeam, currentPosition, isAnimating } = useMoveAnimation(events, teams, config);

  useEffect(() => {
    const channel = supabase.channel("connection_check").subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });
    return () => {
      supabase.removeChannel(channel);
    };
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
        setRevealedCard(payload.content);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (configLoading || !config) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#FAFAF8" }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🎲</div>
          <p className="text-gray-500 font-semibold">Loading game...</p>
        </div>
      </div>
    );
  }

  const sortedTeams = [...teams].sort((a, b) => a.turn_order - b.turn_order);
  const teamMap = new Map<string, Team>(teams.map((t) => [t.id, t]));

  const n = config.tiles_per_side;
  const tileSize = Math.min(
    Math.floor((window.innerWidth * 0.95) / n),
    Math.floor((window.innerHeight * 0.72) / n),
    120
  );
  const boardPx = n * tileSize;
  const camera = getCameraTransform(isAnimating ? currentPosition : null, n, tileSize, boardPx);

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
        {sortedTeams.map((team) => (
          <PlayerCard
            key={team.id}
            team={team}
            isCurrentTurn={team.id === config.current_team_id}
          />
        ))}

        {/* Pot pill — pushes to the right */}
        <div className="ml-auto shrink-0">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-white shadow-md text-sm"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              boxShadow:
                config.pot_total > 0
                  ? "0 0 12px rgba(245, 158, 11, 0.5), 0 2px 8px rgba(0,0,0,0.1)"
                  : "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <span className="text-lg">🪙</span>
            <div>
              <div className="text-xs opacity-80 leading-none">POT</div>
              <div className="text-lg font-extrabold leading-tight tabular-nums">
                {config.pot_total.toLocaleString()}
                <span className="text-xs font-semibold opacity-80 ml-1">
                  pts
                </span>
              </div>
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
              <p className="text-sm mt-1">
                Go to Admin → Board tab to set up the board.
              </p>
            </div>
          )}
        </div>

        {/* Event Log feed */}
        <div className="w-72 shrink-0 bg-white/70 backdrop-blur-sm rounded-2xl mb-4  px-4 py-4 shadow-sm overflow-hidden flex flex-col">
          <EventLogFeed events={events} teamMap={teamMap} />
        </div>
      </div>

      {revealedCard && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setRevealedCard(null)}
        >
          <div className="max-w-lg w-full mx-4 rounded-2xl p-10 text-center border-4 shadow-2xl bg-indigo-700 border-indigo-400">
            <div className="text-sm uppercase tracking-widest mb-4 opacity-75 text-white">
              Chance Card
            </div>
            <div className="text-3xl font-bold leading-snug text-white">
              {revealedCard}
            </div>
            <div className="mt-8 text-sm opacity-60 text-white">Click anywhere to dismiss</div>
          </div>
        </div>
      )}

      {activeActivity && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setActiveActivity(null)}
        >
          <div
            className="max-w-lg w-full mx-4 rounded-2xl p-10 text-center border-4 shadow-2xl"
            style={{
              backgroundColor: activeActivity.color,
              borderColor: activeActivity.color + 'AA',
            }}
          >
            <div className="text-sm uppercase tracking-widest mb-4 opacity-75 text-white">
              {activeActivity.game_mode.replace(/_/g, ' ')}
            </div>
            <div className="text-4xl font-bold leading-snug text-white">
              {activeActivity.title}
            </div>
            <div className="mt-8 text-sm opacity-60 text-white">Click anywhere to dismiss</div>
          </div>
        </div>
      )}
    </div>
  );
}
