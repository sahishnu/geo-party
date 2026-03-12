import { useEffect, useState } from "react";
import Board from "../components/Board";
import PlayerCard from "../components/PlayerCard";
import EventLogFeed from "../components/EventLogFeed";
import { useGameConfig } from "../hooks/useGameConfig";
import { useTeams } from "../hooks/useTeams";
import { useTiles } from "../hooks/useTiles";
import { useEvents } from "../hooks/useEvents";
import { supabase } from "../lib/supabase";
import type { Team } from "../types/database";

export default function BoardView() {
  const { config, loading: configLoading } = useGameConfig();
  const { teams } = useTeams();
  const { tiles } = useTiles();
  const { events } = useEvents(10);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const channel = supabase.channel("connection_check").subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });
    return () => {
      supabase.removeChannel(channel);
    };
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
      <div className="flex flex-1 gap-4 px-5 pb-4 overflow-hidden min-h-0">
        {/* Board area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {tiles.length > 0 ? (
            <Board tiles={tiles} teams={teams} config={config} />
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
        <div className="w-72 shrink-0 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-4 shadow-sm overflow-hidden flex flex-col">
          <EventLogFeed events={events} teamMap={teamMap} />
        </div>
      </div>
    </div>
  );
}
