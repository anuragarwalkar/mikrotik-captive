// Animated network stats bar at the bottom
export default function NetworkBar({ mac, ip, ssid = 'MIKROTIK-SECURE' }) {
  const stats = [
    { label: 'SSID',     value: ssid },
    { label: 'IP ADDR',  value: ip  || '—' },
    { label: 'MAC',      value: mac || '—' },
    { label: 'PROTOCOL', value: 'WPA3-Enterprise' },
    { label: 'STATUS',   value: 'PENDING AUTH', color: 'text-yellow-400' },
  ]

  return (
    <div className="w-full border-t border-cyan-900/30 bg-black/20 backdrop-blur-sm px-6 py-3">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="text-cyan-700 font-orbitron tracking-widest">{s.label}</span>
            <span className={`font-mono ${s.color || 'text-cyan-300'}`}>{s.value}</span>
          </div>
        ))}
        {/* Live pulse */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="status-dot online" />
          <span className="text-xs text-cyber-green font-mono tracking-wider">LIVE</span>
        </div>
      </div>
    </div>
  )
}
