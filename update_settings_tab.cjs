const fs = require('fs');

const path = 'src/pages/LeagueDetail.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add leaveLeague to imports
content = content.replace(
  "import { deleteLeague } from '../services/leagueService'",
  "import { deleteLeague, leaveLeague } from '../services/leagueService'"
);

// 2. Change SettingsTab props and logic
const oldSettingsTabStart = `// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ league, isAdmin, isSuperAdmin, refetch }) {
  const navigate               = useNavigate()
  const [copying, setCopying]  = useState(false)
  const [regen,   setRegen]    = useState(false)
  const [deleting, setDeleting] = useState(false)`;

const newSettingsTabStart = `// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ league, isAdmin, isSuperAdmin, refetch, currentUserId }) {
  const navigate               = useNavigate()
  const [copying, setCopying]  = useState(false)
  const [regen,   setRegen]    = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leaving, setLeaving]   = useState(false)`;

content = content.replace(oldSettingsTabStart, newSettingsTabStart);

// 3. Add handleLeave logic
const oldHandleDeleteEnd = `    try {
      await deleteLeague(league.id)
      navigate('/')
    } finally {
      setDeleting(false)
    }
  }`;

const newHandleDeleteEnd = `    try {
      await deleteLeague(league.id)
      navigate('/')
    } finally {
      setDeleting(false)
    }
  }

  async function handleLeave() {
    if (!window.confirm(\`Leave "\${league.name}"? You will be unlinked from your player profile.\`)) return
    setLeaving(true)
    try {
      await leaveLeague(league.id)
      navigate('/')
    } catch (err) {
      alert(err.message || 'Failed to leave league.')
      setLeaving(false)
    }
  }`;

content = content.replace(oldHandleDeleteEnd, newHandleDeleteEnd);

// 4. Remove the block that hides SettingsTab from non-admins
const blockToRemove = `  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="text-[13px] text-dim text-center py-10">
        Only admins can view league settings.
      </div>
    )
  }`;

content = content.replace(blockToRemove, "");

// 5. Wrap "Invite Players" with an isAdmin check
const oldInvitePlayers = `      <SectionLabel color="accent">Invite Players</SectionLabel>
      <div className="bg-surface border border-line rounded-xl p-4 mb-4">
        <div className="text-[11px] text-dim mb-2">Share this link to invite players:</div>
        <div className="flex items-center gap-2 bg-bg border border-line rounded-lg px-3 py-2 mb-3">
          <span className="flex-1 text-[11px] text-text truncate">{inviteLink}</span>
          <button
            onClick={handleCopy}
            className="text-accent flex items-center gap-1 text-[11px] font-bold bg-transparent border-0 cursor-pointer flex-shrink-0"
          >
            <CopyIcon /> {copying ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {isAdmin && (
          <button
            onClick={handleRegen}
            disabled={regen}
            className="text-[11px] text-dim font-semibold bg-transparent border-0 cursor-pointer disabled:opacity-50"
          >
            {regen ? 'Regenerating…' : '↻ Regenerate code'}
          </button>
        )}
      </div>`;

const newInvitePlayers = `      {(isAdmin || isSuperAdmin) && (
        <>
          <SectionLabel color="accent">Invite Players</SectionLabel>
          <div className="bg-surface border border-line rounded-xl p-4 mb-4">
            <div className="text-[11px] text-dim mb-2">Share this link to invite players:</div>
            <div className="flex items-center gap-2 bg-bg border border-line rounded-lg px-3 py-2 mb-3">
              <span className="flex-1 text-[11px] text-text truncate">{inviteLink}</span>
              <button
                onClick={handleCopy}
                className="text-accent flex items-center gap-1 text-[11px] font-bold bg-transparent border-0 cursor-pointer flex-shrink-0"
              >
                <CopyIcon /> {copying ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {isAdmin && (
              <button
                onClick={handleRegen}
                disabled={regen}
                className="text-[11px] text-dim font-semibold bg-transparent border-0 cursor-pointer disabled:opacity-50"
              >
                {regen ? 'Regenerating…' : '↻ Regenerate code'}
              </button>
            )}
          </div>
        </>
      )}`;

content = content.replace(oldInvitePlayers, newInvitePlayers);

// 6. Update Danger Zone to check for ownership
const isOwnerCheck = `  const isOwner = league?.ownerId === currentUserId;`;
content = content.replace("  const inviteLink = buildInviteLink(league?.inviteCode || '')", isOwnerCheck + "\n  const inviteLink = buildInviteLink(league?.inviteCode || '')");

const oldDangerZone = `      <SectionLabel color="dim">Danger Zone</SectionLabel>
      <div className="bg-surface border border-error/30 rounded-xl p-4 mb-4">
        <div className="text-[13px] font-semibold text-text mb-1">Delete League</div>
        <div className="text-[11px] text-dim mb-3">
          Permanently deletes the league, all tournaments, and all match history.
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 rounded-xl bg-error/10 border border-error/30 text-error font-bold text-[13px] disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete League'}
        </button>
      </div>`;

const newDangerZone = `      <SectionLabel color="dim">Danger Zone</SectionLabel>
      <div className="bg-surface border border-error/30 rounded-xl p-4 mb-4">
        {isOwner ? (
          <>
            <div className="text-[13px] font-semibold text-text mb-1">Delete League</div>
            <div className="text-[11px] text-dim mb-3">
              Permanently deletes the league, all tournaments, and all match history.
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-3 rounded-xl bg-error/10 border border-error/30 text-error font-bold text-[13px] disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete League'}
            </button>
          </>
        ) : (
          <>
            <div className="text-[13px] font-semibold text-text mb-1">Leave League</div>
            <div className="text-[11px] text-dim mb-3">
              You will lose access to this league and its tournaments. Your match history will remain.
            </div>
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="w-full py-3 rounded-xl bg-error/10 border border-error/30 text-error font-bold text-[13px] disabled:opacity-50"
            >
              {leaving ? 'Leaving…' : 'Leave League'}
            </button>
          </>
        )}
      </div>`;

content = content.replace(oldDangerZone, newDangerZone);

// 7. Pass currentUserId from LeagueDetail to SettingsTab
const oldSettingsTabCall = `<SettingsTab league={league} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} refetch={refetch} />`;
const newSettingsTabCall = `<SettingsTab league={league} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} refetch={refetch} currentUserId={profile?.id} />`;
content = content.replace(oldSettingsTabCall, newSettingsTabCall);

fs.writeFileSync(path, content);
console.log('LeagueDetail updated');
