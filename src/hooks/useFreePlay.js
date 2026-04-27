/**
 * useFreePlay — fetches a free play session with nested players, teams, and games.
 * Exposes thin mutation wrappers that call the service then refetch.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  getFreePlay,
  finishFreePlay,
  addFreePlayPlayer,
  removeFreePlayPlayer,
  createFreePlayTeam,
  updateFreePlayTeam,
  deleteFreePlayTeam,
  createFreePlayGame,
  generateFreePlayInviteLink,
} from '../services/freePlayService'

export function useFreePlay(id) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const data = await getFreePlay(id)
      setSession(data)
    } catch (err) {
      setError(err.message || 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addPlayer = async (name, leaguePlayerId = null) => {
    const player = await addFreePlayPlayer(id, { name, leaguePlayerId })
    setSession(s => s ? { ...s, players: [...s.players, player] } : s)
    return player
  }

  const removePlayer = async (playerId) => {
    await removeFreePlayPlayer(playerId)
    setSession(s => s ? {
      ...s,
      players: s.players.filter(p => p.id !== playerId),
      // Also clean the player out of any team rosters
      teams: s.teams.map(t => ({
        ...t,
        playerIds: t.playerIds.filter(pid => pid !== playerId),
      })),
    } : s)
  }

  const createTeam = async (name, playerIds) => {
    const team = await createFreePlayTeam(id, name, playerIds)
    setSession(s => s ? { ...s, teams: [...s.teams, team] } : s)
    return team
  }

  const updateTeam = async (teamId, patch) => {
    const updated = await updateFreePlayTeam(teamId, patch)
    setSession(s => s ? {
      ...s,
      teams: s.teams.map(t => t.id === teamId ? updated : t),
    } : s)
    return updated
  }

  const deleteTeam = async (teamId) => {
    await deleteFreePlayTeam(teamId)
    setSession(s => s ? { ...s, teams: s.teams.filter(t => t.id !== teamId) } : s)
  }

  const startGame = async (team1Id, team2Id, setsPerMatch = 1) => {
    const game = await createFreePlayGame(id, team1Id, team2Id, setsPerMatch)
    setSession(s => s ? { ...s, games: [...(s.games || []), game] } : s)
    return game
  }

  const finishSession = async () => {
    await finishFreePlay(id)
    setSession(s => s ? { ...s, status: 'finished' } : s)
  }

  const inviteLink = id ? generateFreePlayInviteLink(id) : ''

  return {
    session, loading, error, refetch: fetch,
    addPlayer, removePlayer,
    createTeam, updateTeam, deleteTeam,
    startGame, finishSession,
    inviteLink,
  }
}
