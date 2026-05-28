import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'

const barData = [
  { name: 'Santi',   pts: 24 },
  { name: 'Luca',    pts: 18 },
  { name: 'Nico',    pts: 31 },
  { name: 'Fede',    pts: 15 },
  { name: 'Maxi',    pts: 27 },
]

const radarData = [
  { stat: 'Saque',   val: 80 },
  { stat: 'Remate',  val: 65 },
  { stat: 'Bloqueo', val: 70 },
  { stat: 'Defensa', val: 90 },
  { stat: 'Servicio',val: 55 },
]

export default function ChartTest() {
  return (
    <div className="min-h-screen bg-bg p-6 flex flex-col gap-8">
      <h1 className="font-display text-3xl text-accent tracking-wider">RECHARTS TEST</h1>

      <section>
        <h2 className="text-text font-bold text-sm mb-3 uppercase tracking-widest">Puntos por jugador</h2>
        <div className="bg-surface rounded-2xl p-4 border border-line">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12 }}
                labelStyle={{ color: 'var(--color-text)' }}
                itemStyle={{ color: 'var(--color-accent)' }}
              />
              <Bar dataKey="pts" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-text font-bold text-sm mb-3 uppercase tracking-widest">Radar de stats</h2>
        <div className="bg-surface rounded-2xl p-4 border border-line">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-line)" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--color-dim)', fontSize: 11 }} />
              <Radar dataKey="val" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <p className="text-dim text-xs text-center">recharts {'{'}2.15.4{'}'} + React 19 ✓</p>
    </div>
  )
}
