import React, { useState } from "react";
import { uid, levelOf, generateRoundRobinSchedule } from "../lib/utils";

// ── Icons (inline SVG, matching wireframe ic pattern) ───────────────────────
const Ic = ({ d, s = 18, c = "currentColor", sw = 2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const ChevronRight = ({ c }) => <Ic c={c} d={<polyline points="9 18 15 12 9 6" />} />;
const CheckIcon = ({ c }) => <Ic c={c} d={<polyline points="20 6 9 17 4 12" />} />;
const ShuffleIcon = ({ c }) => (
  <Ic c={c} d={<>
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </>} />
);
const EditIcon = ({ c }) => (
  <Ic c={c} d={<>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>} />
);
const PlusIcon = ({ c }) => (
  <Ic c={c} d={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} />
);
const XIcon = ({ c }) => (
  <Ic c={c} s={14} d={<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>} />
);

// ── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = ["Players", "Teams", "Schedule"];
  return (
    <div className="flex items-center px-4 mb-4 pt-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className="flex items-center gap-1.5 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${
              i < current ? "bg-success text-white" :
              i === current ? "bg-accent text-white" :
              "bg-alt text-dim"
            }`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-[11px] font-semibold ${
              i === current ? "text-accent" :
              i < current ? "text-success" : "text-dim"
            }`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-4 h-0.5 rounded shrink-0 mr-1.5 ${i < current ? "bg-success" : "bg-line"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── CTA button ───────────────────────────────────────────────────────────────
function CtaButton({ onClick, disabled, children, variant = "accent" }) {
  const bg = variant === "success" ? "bg-success" : "bg-accent";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full min-h-[48px] rounded-xl text-[14px] font-bold text-white border-0 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 ${bg}`}
    >
      {children}
    </button>
  );
}

// ── Tip box ──────────────────────────────────────────────────────────────────
function Tip({ children }) {
  return (
    <div className="bg-accent/10 border border-accent/20 rounded-xl px-3.5 py-2.5 text-[12px] text-accent leading-relaxed">
      {children}
    </div>
  );
}

// ── STEP 0: PLAYERS ──────────────────────────────────────────────────────────
function PlayersStep({ tournament, setTournaments, players, onNext }) {
  const [search, setSearch] = useState("");
  const invited = players.filter(p => tournament.invitedPlayers.includes(p.id));
  const pool = players.filter(p =>
    !tournament.invitedPlayers.includes(p.id) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const invite = (pid) => setTournaments(prev => prev.map(t =>
    t.id !== tournament.id ? t : { ...t, invitedPlayers: [...t.invitedPlayers, pid] }
  ));

  const remove = (pid) => setTournaments(prev => prev.map(t =>
    t.id !== tournament.id ? t : { ...t, invitedPlayers: t.invitedPlayers.filter(id => id !== pid) }
  ));

  const teamSize = tournament.teamSize || 2;
  const canNext = invited.length >= teamSize * 2;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[16px] font-bold text-text mb-0.5">Invite Players</div>
        <div className="text-[12px] text-dim">Select from your league roster</div>
      </div>

      {/* Search */}
      <div className="bg-surface border border-line rounded-xl px-3.5 py-2.5 flex items-center gap-2">
        <span className="text-dim text-[14px]">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search players..."
          className="flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-dim"
        />
      </div>

      {/* Selected */}
      {invited.length > 0 && (
        <div>
          <div className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">
            Selected ({invited.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {invited.map(p => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 bg-accent/10 text-accent text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
              >
                <span>{levelOf(p.level).icon}</span>
                {p.name}
                <button
                  onClick={() => remove(p.id)}
                  className="bg-transparent border-0 cursor-pointer text-dim flex items-center"
                >
                  <XIcon />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Available */}
      <div>
        <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">
          League Players
        </div>
        <div className="flex flex-col gap-1.5">
          {pool.length === 0 && (
            <div className="text-[13px] text-dim text-center py-4">
              {search ? "No players match your search" : "All league players are already invited"}
            </div>
          )}
          {pool.map(p => (
            <div
              key={p.id}
              onClick={() => invite(p.id)}
              className="bg-surface border border-line rounded-xl px-3.5 py-2.5 flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-alt flex items-center justify-center text-[13px] font-bold text-text shrink-0">
                {p.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-text truncate">{p.name}</div>
                <div className="text-[11px] text-dim">{levelOf(p.level).label}</div>
              </div>
              <div className="w-6 h-6 rounded-md border border-line flex items-center justify-center text-dim shrink-0">
                <PlusIcon />
              </div>
            </div>
          ))}
        </div>
      </div>

      {!canNext && invited.length > 0 && (
        <div className="text-[11px] text-dim text-center">
          Need at least {teamSize * 2} players to form 2 teams
        </div>
      )}

      <CtaButton onClick={onNext} disabled={!canNext}>
        Next: Create Teams <ChevronRight c="#fff" />
      </CtaButton>
    </div>
  );
}

// ── Team generation algorithm ─────────────────────────────────────────────────
const LEVEL_SCORE = { beginner: 1, intermediate: 2, advanced: 3 };

function snakeDraft(sorted, numTeams, teamSize) {
  const teams = Array.from({ length: numTeams }, () => []);
  sorted.forEach((p, i) => {
    const row = Math.floor(i / numTeams);
    const col = row % 2 === 0 ? i % numTeams : numTeams - 1 - (i % numTeams);
    if (teams[col] && teams[col].length < teamSize) teams[col].push(p.id);
  });
  return teams.filter(t => t.length === teamSize);
}

function interleave(...arrs) {
  const result = [];
  const max = Math.max(...arrs.map(a => a.length), 0);
  for (let i = 0; i < max; i++) {
    arrs.forEach(arr => { if (i < arr.length) result.push(arr[i]); });
  }
  return result;
}

// params = ordered array of 'sex' | 'level', defining priority
function buildTeamGroups(pool, params, teamSize) {
  const n = Math.floor(pool.length / teamSize);
  if (n < 1) return [];

  const byLevel = arr => [...arr].sort((a, b) => (LEVEL_SCORE[b.level] || 1) - (LEVEL_SCORE[a.level] || 1));
  const rand = arr => [...arr].sort(() => Math.random() - 0.5);
  const males = p => p.sex === "M";
  const females = p => p.sex === "F";
  const other = p => p.sex !== "M" && p.sex !== "F";

  let sorted;

  if (params.length === 0) {
    sorted = rand(pool);
  } else if (params[0] === "sex" && params.length === 1) {
    sorted = interleave(rand(pool.filter(males)), rand(pool.filter(females)), rand(pool.filter(other)));
  } else if (params[0] === "level" && params.length === 1) {
    sorted = byLevel(pool);
  } else if (params[0] === "sex" && params[1] === "level") {
    // Primary: balance sex. Secondary: balance level within each sex group.
    sorted = interleave(byLevel(pool.filter(males)), byLevel(pool.filter(females)), byLevel(pool.filter(other)));
  } else if (params[0] === "level" && params[1] === "sex") {
    // Primary: balance level. Secondary: alternate sex within same level.
    sorted = [...pool].sort((a, b) => {
      const ld = (LEVEL_SCORE[b.level] || 1) - (LEVEL_SCORE[a.level] || 1);
      if (ld !== 0) return ld;
      const s = x => x.sex === "M" ? 0 : x.sex === "F" ? 1 : 2;
      return s(a) - s(b);
    });
  } else {
    sorted = rand(pool);
  }

  return snakeDraft(sorted, n, teamSize);
}

function paramDescription(params) {
  if (params.length === 0) return "Teams are generated randomly with no prioritization.";
  if (params.length === 1 && params[0] === "sex") return "Teams are balanced by sex — males and females distributed evenly.";
  if (params.length === 1 && params[0] === "level") return "Teams are balanced by skill level using a snake draft.";
  if (params[0] === "sex" && params[1] === "level") return "First balances sex across teams, then balances skill level within each sex group.";
  if (params[0] === "level" && params[1] === "sex") return "First balances skill level across teams, then uses sex as a tiebreaker within each level.";
  return "Teams generated with the selected parameters.";
}

// ── STEP 1: TEAMS ─────────────────────────────────────────────────────────────
function TeamsStep({ tournament, setTournaments, players, onNext, onBack }) {
  const teamSize = tournament.teamSize || 2;
  const invited = players.filter(p => tournament.invitedPlayers.includes(p.id));
  const assigned = new Set(tournament.teams.flatMap(tm => tm.players));
  const unassigned = invited.filter(p => !assigned.has(p.id));

  // Auto mode state
  const [mode, setMode] = useState("auto");
  const [params, setParams] = useState([]); // ordered: ['sex','level']
  const [proposed, setProposed] = useState(null);

  // Manual mode state: pending team being built
  const [pickingForTeam, setPickingForTeam] = useState(null); // team id
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);

  const toggleParam = (p) => {
    setParams(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
    setProposed(null);
  };

  const propose = () => {
    const groups = buildTeamGroups(unassigned, params, teamSize);
    setProposed(groups.map((pIds, i) => ({
      id: uid(),
      name: "Team " + (tournament.teams.length + i + 1),
      players: pIds,
      wins: 0, losses: 0, points: 0,
    })));
  };

  const confirmProposed = () => {
    if (!proposed) return;
    setTournaments(prev => prev.map(t =>
      t.id !== tournament.id ? t : { ...t, teams: [...t.teams, ...proposed] }
    ));
    setProposed(null);
  };

  const removeTeam = (teamId) => {
    setTournaments(prev => prev.map(t =>
      t.id !== tournament.id ? t : { ...t, teams: t.teams.filter(tm => tm.id !== teamId) }
    ));
  };

  // Manual: add a new empty team
  const createManualTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeam = {
      id: uid(),
      name: newTeamName.trim(),
      players: [],
      wins: 0, losses: 0, points: 0,
    };
    setTournaments(prev => prev.map(t =>
      t.id !== tournament.id ? t : { ...t, teams: [...t.teams, newTeam] }
    ));
    setNewTeamName("");
    setAddingTeam(false);
  };

  // Manual: assign player to a team slot
  const assignPlayer = (teamId, pid) => {
    setTournaments(prev => prev.map(t => {
      if (t.id !== tournament.id) return t;
      return {
        ...t,
        teams: t.teams.map(tm =>
          tm.id !== teamId ? tm :
          tm.players.length < teamSize ? { ...tm, players: [...tm.players, pid] } : tm
        ),
      };
    }));
    setPickingForTeam(null);
  };

  // Manual: remove player from team
  const removePlayer = (teamId, pid) => {
    setTournaments(prev => prev.map(t =>
      t.id !== tournament.id ? t : {
        ...t,
        teams: t.teams.map(tm =>
          tm.id !== teamId ? tm : { ...tm, players: tm.players.filter(id => id !== pid) }
        ),
      }
    ));
  };

  const canNext = tournament.teams.length >= 2 && tournament.teams.every(tm => tm.players.length === teamSize);
  const PARAM_DEFS = [
    { id: "sex",   label: "Sex",   icon: "⚥" },
    { id: "level", label: "Level", icon: "📊" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[16px] font-bold text-text mb-0.5">Create Teams</div>
        <div className="text-[12px] text-dim">
          {invited.length} players · {teamSize} per team
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-alt rounded-xl p-1">
        {[{ id: "auto", label: "Auto Generate", Icon: ShuffleIcon },
          { id: "manual", label: "Manual", Icon: EditIcon }].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[12px] font-semibold cursor-pointer border-0 transition-all ${
              mode === m.id
                ? "bg-surface text-accent shadow-sm"
                : "bg-transparent text-dim"
            }`}
          >
            <m.Icon c={mode === m.id ? "var(--color-accent, #F5A623)" : "var(--color-dim, #7A8EA0)"} />
            {m.label}
          </button>
        ))}
      </div>

      {/* ── AUTO SECTION ── */}
      {mode === "auto" && (
        <div className="flex flex-col gap-3">

          {/* Parameter selector */}
          <div className="bg-surface border border-line rounded-xl px-3.5 py-3">
            <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2.5">
              Balance by (tap to set priority)
            </div>
            <div className="flex gap-2 mb-2.5">
              {PARAM_DEFS.map(({ id, label, icon }) => {
                const idx = params.indexOf(id);
                const active = idx !== -1;
                return (
                  <button
                    key={id}
                    onClick={() => toggleParam(id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold border-2 cursor-pointer transition-all ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line bg-alt text-dim"
                    }`}
                  >
                    <span>{icon}</span>
                    {label}
                    {active && (
                      <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center leading-none shrink-0">
                        {idx + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Priority order display */}
            {params.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-dim">Priority:</span>
                {params.map((p, i) => {
                  const def = PARAM_DEFS.find(d => d.id === p);
                  return (
                    <span key={p} className="flex items-center gap-1 text-[11px] font-semibold text-accent">
                      {i > 0 && <span className="text-dim">→</span>}
                      {def.icon} {def.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info tip */}
          <Tip>💡 {paramDescription(params)}</Tip>

          {/* Generated teams display */}
          {proposed && (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-bold text-dim uppercase tracking-wide">
                Preview ({proposed.length} teams)
              </div>
              {proposed.map(tm => (
                <div key={tm.id} className="bg-surface border border-line rounded-xl px-3.5 py-3">
                  <div className="text-[14px] font-bold text-text mb-1.5">{tm.name}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tm.players.map(pid => {
                      const pl = players.find(p => p.id === pid);
                      return pl ? (
                        <span key={pid} className="flex items-center gap-1 bg-accent/10 text-accent text-[11px] font-medium px-2.5 py-1 rounded-lg">
                          <span>{levelOf(pl.level).icon}</span>
                          {pl.name}
                          {pl.sex && <span className="text-[10px] text-accent/70">({pl.sex})</span>}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Existing confirmed teams */}
          {tournament.teams.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-bold text-success uppercase tracking-wide">
                Confirmed ({tournament.teams.length} teams)
              </div>
              {tournament.teams.map(tm => (
                <div key={tm.id} className="bg-surface border border-success/30 rounded-xl px-3.5 py-3 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-text mb-1">{tm.name}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {tm.players.map(pid => {
                        const pl = players.find(p => p.id === pid);
                        return pl ? (
                          <span key={pid} className="flex items-center gap-1 bg-accent/10 text-accent text-[11px] font-medium px-2 py-0.5 rounded-lg">
                            <span>{levelOf(pl.level).icon}</span>{pl.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => removeTeam(tm.id)}
                    className="bg-transparent border-0 cursor-pointer text-dim text-[18px] leading-none shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {!proposed ? (
            <button
              onClick={propose}
              disabled={unassigned.length < teamSize}
              className="w-full min-h-[44px] border border-dashed border-accent/50 rounded-xl text-[13px] font-semibold text-accent bg-transparent cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <ShuffleIcon c="var(--color-accent, #F5A623)" />
              {tournament.teams.length > 0 ? "Generate more teams" : "Generate teams"}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={propose}
                className="min-h-[44px] rounded-xl text-[13px] font-semibold text-text bg-surface border border-line cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShuffleIcon c="var(--color-text, #E8ECF1)" /> Regenerate
              </button>
              <button
                onClick={confirmProposed}
                className="min-h-[44px] rounded-xl text-[13px] font-bold text-white bg-accent border-0 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckIcon c="#fff" /> Confirm
              </button>
            </div>
          )}

          {unassigned.length > 0 && unassigned.length < teamSize && (
            <div className="text-[11px] text-dim text-center">
              {unassigned.length} unassigned player{unassigned.length > 1 ? "s" : ""} — not enough for a full team
            </div>
          )}
        </div>
      )}

      {/* ── MANUAL SECTION ── */}
      {mode === "manual" && (
        <div className="flex flex-col gap-3">
          {/* Team cards */}
          {tournament.teams.length === 0 && !addingTeam && (
            <div className="bg-surface border border-line rounded-xl p-6 text-center text-dim text-[13px]">
              Add your first team below
            </div>
          )}
          {tournament.teams.map(tm => (
            <div
              key={tm.id}
              className={`bg-surface rounded-xl border px-3.5 py-3 ${
                tm.players.length === teamSize ? "border-success/40" : "border-line"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-bold text-text">{tm.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-dim">{tm.players.length}/{teamSize}</span>
                  <button
                    onClick={() => removeTeam(tm.id)}
                    className="bg-transparent border-0 cursor-pointer text-dim text-[16px] leading-none"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tm.players.map(pid => {
                  const pl = players.find(p => p.id === pid);
                  return pl ? (
                    <span
                      key={pid}
                      className="flex items-center gap-1 bg-accent/10 text-accent text-[11px] font-medium px-2.5 py-1 rounded-lg"
                    >
                      <span>{levelOf(pl.level).icon}</span>
                      {pl.name}
                      <button
                        onClick={() => removePlayer(tm.id, pid)}
                        className="bg-transparent border-0 cursor-pointer text-dim flex items-center"
                      >
                        <XIcon />
                      </button>
                    </span>
                  ) : null;
                })}
                {tm.players.length < teamSize && (
                  <button
                    onClick={() => setPickingForTeam(pickingForTeam === tm.id ? null : tm.id)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border border-dashed cursor-pointer transition-all ${
                      pickingForTeam === tm.id
                        ? "border-accent text-accent bg-accent/10"
                        : "border-dim/40 text-dim bg-transparent"
                    }`}
                  >
                    + Add player
                  </button>
                )}
              </div>
              {/* Inline player picker */}
              {pickingForTeam === tm.id && (
                <div className="mt-2.5 pt-2.5 border-t border-line flex flex-wrap gap-1.5">
                  {unassigned.length === 0 ? (
                    <span className="text-[11px] text-dim">No unassigned players</span>
                  ) : (
                    unassigned.map(p => (
                      <button
                        key={p.id}
                        onClick={() => assignPlayer(tm.id, p.id)}
                        className="flex items-center gap-1 bg-alt text-text text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-line cursor-pointer active:opacity-70 transition-opacity"
                      >
                        <span>{levelOf(p.level).icon}</span>
                        {p.name}
                        {p.sex && <span className="text-[10px] text-dim">({p.sex})</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {/* New team input */}
          {addingTeam ? (
            <div className="bg-surface border border-accent/40 rounded-xl px-3.5 py-3 flex gap-2">
              <input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createManualTeam()}
                placeholder="Team name…"
                autoFocus
                className="flex-1 bg-transparent text-[14px] font-bold text-text outline-none placeholder:text-dim"
              />
              <button
                onClick={createManualTeam}
                disabled={!newTeamName.trim()}
                className="text-accent font-bold text-[14px] bg-transparent border-0 cursor-pointer disabled:opacity-40"
              >
                Add
              </button>
              <button
                onClick={() => { setAddingTeam(false); setNewTeamName(""); }}
                className="text-dim bg-transparent border-0 cursor-pointer text-[14px]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingTeam(true)}
              className="w-full min-h-[44px] border border-dashed border-accent/50 rounded-xl text-[13px] font-semibold text-accent bg-transparent cursor-pointer flex items-center justify-center gap-2"
            >
              <PlusIcon c="var(--color-accent, #F5A623)" /> Add Team
            </button>
          )}

          {/* Unassigned players */}
          {unassigned.length > 0 && (
            <div className="bg-alt rounded-xl px-3.5 py-3">
              <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">
                Unassigned ({unassigned.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map(p => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1 bg-surface text-text text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-line"
                  >
                    <span>{levelOf(p.level).icon}</span>
                    {p.name}
                    {p.sex && <span className="text-[10px] text-dim">({p.sex})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CtaButton onClick={onNext} disabled={!canNext}>
        Next: Generate Schedule <ChevronRight c="#fff" />
      </CtaButton>
      {!canNext && tournament.teams.length > 0 && (
        <div className="text-[11px] text-dim text-center -mt-2">
          All teams must have exactly {teamSize} players
        </div>
      )}
    </div>
  );
}

// ── STEP 2: SCHEDULE ──────────────────────────────────────────────────────────
function ScheduleStep({ tournament, setTournaments, players, onDone, onBack }) {
  const teamSize = tournament.teamSize || 2;
  const teams = tournament.teams;
  const preview = generateRoundRobinSchedule(teams.map(t => t.id));

  const startTournament = () => {
    setTournaments(prev => prev.map(t =>
      t.id !== tournament.id ? t : {
        ...t,
        phase: "freeplay",
        matches: preview,
      }
    ));
    onDone();
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[16px] font-bold text-text mb-0.5">Schedule</div>
        <div className="text-[12px] text-dim">
          Round-robin · {teams.length} teams · {preview.length} matches
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {preview.map((m, i) => {
          const t1 = teams.find(t => t.id === m.team1);
          const t2 = teams.find(t => t.id === m.team2);
          return (
            <div key={m.id} className="bg-surface border border-line rounded-xl px-3.5 py-3">
              <div className="text-[10px] font-bold text-accent uppercase tracking-wide mb-1">
                Match {i + 1}
              </div>
              <div className="text-[14px] font-semibold text-text">
                {t1?.name ?? "?"} <span className="text-dim font-normal">vs</span> {t2?.name ?? "?"}
              </div>
              <div className="text-[11px] text-dim mt-0.5">
                {t1 && t1.players.map(pid => players.find(p => p.id === pid)?.name).filter(Boolean).join(", ")}
                {" · "}
                {t2 && t2.players.map(pid => players.find(p => p.id === pid)?.name).filter(Boolean).join(", ")}
              </div>
            </div>
          );
        })}
      </div>

      <Tip>
        📋 Schedule auto-generated as round-robin. All teams play each other once.
      </Tip>

      <CtaButton onClick={startTournament} variant="success">
        <CheckIcon c="#fff" /> Start Tournament
      </CtaButton>
    </div>
  );
}

// ── MAIN WIZARD ───────────────────────────────────────────────────────────────
export default function TournamentSetupWizard({ tournament, setTournaments, players, onDone }) {
  const [step, setStep] = useState(0);

  return (
    <div>
      <StepIndicator current={step} />
      <div className="flex flex-col gap-0">
        {step === 0 && (
          <PlayersStep
            tournament={tournament}
            setTournaments={setTournaments}
            players={players}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <TeamsStep
            tournament={tournament}
            setTournaments={setTournaments}
            players={players}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <ScheduleStep
            tournament={tournament}
            setTournaments={setTournaments}
            players={players}
            onDone={onDone}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </div>
  );
}
