import { Trophy, Check, Undo2 } from "lucide-react";
import { AppButton } from "./ui-new";
import { buildResultFraming } from "../lib/matchInsights";
import { useAuth } from "../contexts/AuthContext";
import { TONES, ICONS } from "./stats/storyTheme";

/**
 * Lightweight "match finished" screen shown the moment the final point lands
 * (LiveScoreboard's winner branch). Deliberately minimal — no charts, no
 * tabs, no stat tables — so the save moment renders instantly on court:
 * winner + score, the Match Story one-liner, undo (mis-tapped match point),
 * and Save result. Full stats live on the match card after saving
 * (MatchStatsOverlay → GameStats).
 */
const MatchFinishedScreen = ({
  winner,
  team1Id, team2Id,
  sets, t1Sets, t2Sets,
  log,
  teams, players,
  onSaveResult, activeTourMatchId,
  isSaving,
  reset,
  hasHistory,
  onRequestUndo,
  pendingUndo,
  onConfirmUndo,
  onCancelUndo,
}) => {
  const getTeam   = id => teams.find(tm => tm.id === id);
  const getPlayer = id => {
    if (id && id.startsWith("free_")) return { id, name: id.slice(5) };
    return players.find(p => p.id === id);
  };
  const tName      = id => getTeam(id)?.name || "?";
  const firstName  = id => (getPlayer(id)?.name || "?").split(" ")[0];

  const teamPlayerIds = (teamId) => {
    const team = teams.find(tm => tm.id === teamId);
    if (!team) return [];
    if (team.players && team.players.length > 0) return team.players;
    return [team.player1, team.player2].filter(Boolean);
  };

  const pointLog = log.filter(e => e.team);
  const derivedWinnerTeam = t1Sets > t2Sets ? 1 : t2Sets > t1Sets ? 2 : (winner === 1 ? 1 : 2);
  const winnerIsTeam1 = derivedWinnerTeam === 1;
  const winnerColor = winnerIsTeam1 ? "text-accent" : "text-free";
  const winnerBorder = winnerIsTeam1 ? "border-accent/40" : "border-free/40";
  const winnerGradient = winnerIsTeam1
    ? "bg-gradient-to-br from-accent/15 to-surface"
    : "bg-gradient-to-br from-free/15 to-surface";

  const t1Ids = teamPlayerIds(team1Id);
  const t2Ids = teamPlayerIds(team2Id);
  const allIds = [...t1Ids, ...t2Ids];

  const { session } = useAuth();
  const authUserId = session?.user?.id ?? null;
  const viewerPlayerId = authUserId
    ? (players.find(p => p.userId === authUserId && allIds.includes(p.id))?.id ?? null)
    : null;
  const result = buildResultFraming({
    pointLog, sets,
    winnerTeam: derivedWinnerTeam,
    t1Ids, t2Ids,
    team1Name: tName(team1Id),
    team2Name: tName(team2Id),
    viewerPlayerId,
  });
  const framing = result?.framing;
  const framingTone = framing ? (TONES[framing.tone] ?? TONES.dim) : null;
  const FramingIcon = framing ? (ICONS[framing.icon] ?? Trophy) : null;

  return (
    <div>

      {pendingUndo && (
        <div className="bg-error text-white px-4 py-2.5 flex items-center justify-between text-[13px] font-bold rounded-xl mb-3">
          <span>Undo last point?</span>
          <div className="flex gap-4">
            <button onClick={onCancelUndo} className="bg-transparent border-0 text-white/70 cursor-pointer">Cancel</button>
            <button onClick={onConfirmUndo} className="bg-white text-error px-3 py-1 rounded cursor-pointer">Yes</button>
          </div>
        </div>
      )}

      {hasHistory && !pendingUndo && (
        <button
          onClick={onRequestUndo}
          className="flex items-center gap-1.5 text-dim text-[13px] font-semibold mb-3 bg-transparent border-0 cursor-pointer px-0 py-1"
        >
          <Undo2 size={16} />
          <span>Undo last point</span>
        </button>
      )}

      {/* Winner banner */}
      <div className={`${winnerGradient} ${winnerBorder} border rounded-[14px] px-4 py-4 mb-3`}>
        {/* Trophy */}
        <div className="flex justify-center mb-3">
          <Trophy size={28} className={winnerColor} />
        </div>

        {/* Two-column score */}
        <div className="flex items-center gap-0.5">
          {/* Team 1 */}
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1 min-h-[18px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                {tName(team1Id)}
              </span>
              {winnerIsTeam1 && (
                <span className="text-[9px] font-bold bg-accent text-bg px-1.5 py-0.5 rounded-[4px] leading-none">WIN</span>
              )}
            </div>
            <div className={`font-display text-[48px] leading-none ${winnerIsTeam1 ? "text-accent" : "text-accent/50"}`}>
              {sets.length === 1 ? sets[0].s1 : t1Sets}
            </div>
            <div className="text-[10px] text-dim mt-1.5">
              {teamPlayerIds(team1Id).map(pid => firstName(pid)).join(" · ")}
            </div>
          </div>

          {/* Divider */}
          <div className="text-[20px] text-dim/40 flex-shrink-0 pb-6">—</div>

          {/* Team 2 */}
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1 min-h-[18px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-free">
                {tName(team2Id)}
              </span>
              {!winnerIsTeam1 && (
                <span className="text-[9px] font-bold bg-free text-bg px-1.5 py-0.5 rounded-[4px] leading-none">WIN</span>
              )}
            </div>
            <div className={`font-display text-[48px] leading-none ${!winnerIsTeam1 ? "text-free" : "text-free/50"}`}>
              {sets.length === 1 ? sets[0].s2 : t2Sets}
            </div>
            <div className="text-[10px] text-dim mt-1.5">
              {teamPlayerIds(team2Id).map(pid => firstName(pid)).join(" · ")}
            </div>
          </div>
        </div>

        {/* Multi-set breakdown */}
        {sets.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {sets.map((s, i) => (
              <div key={i} className="bg-bg rounded-[8px] px-2.5 py-[5px] text-center">
                <div className="text-[9px] text-dim mb-1">Set {i + 1}</div>
                <div className="flex gap-[3px] items-center justify-center">
                  <span className={`text-[13px] font-bold ${s.winner === 1 ? "text-accent" : "text-accent/60"}`}>{s.s1}</span>
                  <span className="text-[9px] text-dim">-</span>
                  <span className={`text-[13px] font-bold ${s.winner === 2 ? "text-free" : "text-free/60"}`}>{s.s2}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Story one-liner */}
      {framing && (
        <div className={`border rounded-[14px] px-4 py-3.5 mb-3 ${framingTone.card}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${framingTone.chip}`}>
              <FramingIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold text-text leading-snug">{framing.headline}</div>
              <div className="text-[12px] text-dim leading-relaxed mt-0.5">{framing.detail}</div>
            </div>
          </div>
        </div>
      )}

      <div className="text-[11px] text-dim text-center mb-3">
        {onSaveResult && activeTourMatchId
          ? "Full stats will be on the match card after saving."
          : "Full stats will be on the match card."}
      </div>

      {onSaveResult && activeTourMatchId && (() => {
        const winnerTeamId = winner === 1 ? team1Id : team2Id;
        const finalS1 = sets.reduce((acc, s) => acc + (s.winner === 1 ? 1 : 0), 0);
        const finalS2 = sets.reduce((acc, s) => acc + (s.winner === 2 ? 1 : 0), 0);
        return (
          <AppButton
            variant="success"
            disabled={isSaving}
            onClick={() => !isSaving && onSaveResult(activeTourMatchId, finalS1, finalS2, winnerTeamId, log, sets)}
            className="mb-2.5"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check size={16} /> Save result
              </span>
            )}
          </AppButton>
        );
      })()}
      {reset && (
        <AppButton variant="accent" onClick={reset}>
          New match
        </AppButton>
      )}

    </div>
  );
};

export default MatchFinishedScreen;
