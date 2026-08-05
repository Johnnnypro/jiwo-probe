import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Activity, ArrowDown, ArrowUp, BadgeDollarSign, CalendarClock, ChevronLeft, Cpu, HardDrive, MemoryStick, PieChart, Wallet, Wifi, X } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ProbePingSeries, ProbeServer } from './types'
import { Twemoji } from './Twemoji'
import { Meter, ReturnRouteBadges, averagePing, bytes, expiring, expired, hasLeadingFlag, pct, regionFlag, remainingDays, speed } from './App'

const cycleLabel = {
  month: '月',
  quarter: '季',
  half_year: '半年',
  year: '年',
} as const

const CYCLE_DAYS = {
  month: 30,
  quarter: 90,
  half_year: 180,
  year: 365,
} as const

interface RemainingValue {
  days: number
  cycleDays: number
  daily: number
  value: number
  currency: string
  isCny: boolean
}

function computeRemainingValue(server: ProbeServer): RemainingValue | null {
  if (!server.expires_at || server.renewal_price === undefined) return null
  const expires = new Date(`${server.expires_at}T23:59:59`).getTime()
  const days = Math.ceil((expires - Date.now()) / 86400000)
  if (days <= 0) return null // 已过期，无剩余价值
  const cycleDays = CYCLE_DAYS[server.renewal_cycle || 'month']
  const isCny = server.renewal_price_cny !== undefined
  const price = isCny ? server.renewal_price_cny! : server.renewal_price
  const daily = price / cycleDays
  return {
    days,
    cycleDays,
    daily,
    value: daily * days,
    currency: isCny ? 'CNY' : server.renewal_currency || 'CNY',
    isCny,
  }
}

function formatMoney(value: number, currency: string, isCny: boolean): string {
  if (isCny) return `¥${value.toFixed(0)}`
  return `${currency} ${value.toFixed(2)}`
}

function RemainingValueBlock({ server }: { server: ProbeServer }) {
  const rv = computeRemainingValue(server)
  if (!rv) return null
  const percent = Math.min(100, Math.max(0, (rv.days / rv.cycleDays) * 100))
  return (
    <div className="detail-value">
      <div className="detail-value-main">
        <span>
          <BadgeDollarSign size={15} />
          剩余价值
        </span>
        <strong>{formatMoney(rv.value, rv.currency, rv.isCny)}</strong>
        <small>≈ 按剩余天数折算</small>
      </div>
      <div className="detail-value-sub">
        <span>日成本 {formatMoney(rv.daily, rv.currency, rv.isCny)}</span>
        <span>
          剩余 {rv.days} / {rv.cycleDays} 天
        </span>
      </div>
      <div className="meter">
        <i style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

const RANGES = [
  { key: '1h', label: '1 小时', bucketLabel: (index: number, count: number) => `-${(count - index) * 5}m` },
  { key: '6h', label: '6 小时', bucketLabel: (index: number, count: number) => `-${(((count - index) * 10) / 60).toFixed(1)}h` },
  { key: '24h', label: '24 小时', bucketLabel: (index: number, count: number) => `-${(((count - index) * 30) / 60).toFixed(0)}h` },
] as const
type RangeKey = (typeof RANGES)[number]['key']

const colors = ['#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899']

function PingTrendChart({ serverIndex, initial, targetKey }: { serverIndex: number; initial: ProbePingSeries[]; targetKey: string }) {
  const [range, setRange] = useState<RangeKey>('1h')
  const [series, setSeries] = useState<ProbePingSeries[]>(initial)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void fetch(`/api/series?server=${serverIndex}&range=${range}&all=1`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<{
          success: boolean
          series?: ProbePingSeries
          all_series?: ProbePingSeries[]
        }>
      })
      .then((payload) => {
        if (payload.success) setSeries([...(payload.series ? [{ ...payload.series, key: '__avg__', label: '平均' }] : []), ...(payload.all_series || [])])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [range, serverIndex])

  const rangeMeta = RANGES.find((item) => item.key === range) || RANGES[0]
  const rows = useMemo(
    () =>
      Array.from({ length: series[0]?.buckets.length || 0 }, (_, index) => {
        const row: Record<string, string | number | null> = {
          time: rangeMeta.bucketLabel(index, series[0]?.buckets.length || 0),
        }
        for (const item of series) {
          const bucket = item.buckets[index]
          row[item.key || item.label] = bucket && bucket.ms >= 0 ? bucket.ms : null
        }
        return row
      }),
    [series, rangeMeta],
  )

  return (
    <>
      <div className="ranges">
        {RANGES.map((item) => (
          <button type="button" className={range === item.key ? 'active' : ''} onClick={() => setRange(item.key)} key={item.key}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="detail-chart">
        {loading && <div className="loading-overlay">加载中…</div>}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.max(1, Math.floor(rows.length / 8))} />
            <YAxis width={52} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="ms" />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(value, _name, item) => [`${Number(value).toFixed(0)}ms`, series.find((line) => (line.key || line.label) === item.dataKey)?.label || String(item.dataKey)]} />
            {series.map((item, index) => {
              const key = item.key || item.label
              const active = key === targetKey
              return <Line key={key} type="monotone" dataKey={key} name={item.label} stroke={key === '__avg__' ? 'var(--foreground, #2f2350)' : colors[index % colors.length]} strokeWidth={active ? 2.5 : 1} strokeOpacity={active ? 1 : 0.45} dot={false} connectNulls={false} isAnimationActive={false} />
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="legend">
        {series.map((item, index) => {
          const key = item.key || item.label
          return (
            <span className={key === targetKey ? 'active' : ''} key={key}>
              <i style={{ background: key === '__avg__' ? 'var(--foreground, #2f2350)' : colors[index % colors.length] }} />
              {item.label}
            </span>
          )
        })}
      </div>
    </>
  )
}

function DetailMetric({ icon, label, value, percent }: { icon: React.ReactNode; label: string; value: string; percent: number }) {
  return (
    <div className="detail-metric">
      <div className="detail-metric-head">
        <span>
          {icon}
          {label}
        </span>
        <strong>{value}</strong>
      </div>
      <div className="meter">
        <i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  )
}

export function ServerDetail({ server, index, onClose }: { server: ProbeServer; index: number; onClose: () => void }) {
  const [selected, setSelected] = useState('__avg__')
  const name = server.name || `服务器 ${index + 1}`
  const flag = regionFlag(server.region)
  const ping = server.ping || []
  const average = averagePing(ping)
  const lines = [{ ...average, key: '__avg__' }, ...ping]

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className="server-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="server-detail" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label={name}>
        <header className="server-detail-header">
          <button aria-label="返回" onClick={onClose}>
            <ChevronLeft size={18} />
          </button>
          <div className="server-detail-title">
            <span className={server.online ? 'status online' : 'status'} />
            <h2>
              <Twemoji>{flag && !hasLeadingFlag(name) ? `${flag} ${name}` : name}</Twemoji>
            </h2>
            <span className={server.online ? 'detail-online' : 'detail-offline'}>{server.online ? '在线' : '离线'}</span>
          </div>
          <button aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="server-detail-body">
          <div className="detail-cols">
            <section className="detail-panel">
              <h3>资源占用</h3>
              <div className="detail-grid">
                {server.cpu_pct !== undefined && <DetailMetric icon={<Cpu size={15} />} label="CPU" value={`${server.cpu_pct.toFixed(1)}%`} percent={server.cpu_pct} />}
                {server.mem_total !== undefined && <DetailMetric icon={<MemoryStick size={15} />} label="内存" value={`${bytes(server.mem_used)} / ${bytes(server.mem_total)}`} percent={pct(server.mem_used, server.mem_total)} />}
                {server.disk_total !== undefined && <DetailMetric icon={<HardDrive size={15} />} label="硬盘" value={`${bytes(server.disk_used)} / ${bytes(server.disk_total)}`} percent={pct(server.disk_used, server.disk_total)} />}
                {server.traffic_used !== undefined && (
                  <DetailMetric
                    icon={<PieChart size={15} />}
                    label="流量"
                    value={server.traffic_limit ? `${bytes(server.traffic_used, false)} / ${bytes(server.traffic_limit, false)}` : bytes(server.traffic_used, false)}
                    percent={pct(server.traffic_used, server.traffic_limit)}
                  />
                )}
              </div>
              {server.loadavg && (
                <div className="detail-loadavg">
                  <Activity size={14} />
                  负载: <code>{server.loadavg}</code>
                </div>
              )}
              {(server.upload_speed !== undefined || server.download_speed !== undefined) && (
                <div className="detail-speed">
                  <span className="download">
                    <ArrowDown size={16} />
                    下行 {speed(server.download_speed)}
                  </span>
                  <span className="upload">
                    <ArrowUp size={16} />
                    上行 {speed(server.upload_speed)}
                  </span>
                </div>
              )}
            </section>

            <div className="detail-col-stack">
              {(server.expires_at || server.renewal_price !== undefined) && (
                <section className="detail-panel">
                  <h3>到期与续费</h3>
                  <div className="detail-meta">
                    {server.expires_at &&
                      (server.provider_url ? (
                        <a href={server.provider_url} target="_blank" rel="noopener noreferrer" className={expiring(server) || expired(server) ? 'warning' : ''} title={server.provider_name ? `前往 ${server.provider_name} 续费` : '前往服务商续费'}>
                          <CalendarClock size={13} />
                          {remainingDays(server.expires_at)}
                          <small>{server.expires_at}</small>
                        </a>
                      ) : (
                        <span className={expiring(server) || expired(server) ? 'warning' : ''}>
                          <CalendarClock size={13} />
                          {remainingDays(server.expires_at)}
                          <small>{server.expires_at}</small>
                        </span>
                      ))}
                    {server.renewal_price !== undefined && (
                      <span>
                        <Wallet size={13} />
                        {server.renewal_price_cny !== undefined ? `¥${server.renewal_price_cny.toFixed(2)}` : `${server.renewal_currency || 'CNY'} ${server.renewal_price}`} / {cycleLabel[server.renewal_cycle || 'month']}
                        {server.renewal_price_cny !== undefined && server.renewal_currency !== 'CNY' && <small>（{server.renewal_currency} {server.renewal_price}）</small>}
                      </span>
                    )}
                    {server.provider_name && (
                      <span>
                        <Wifi size={13} />
                        服务商: {server.provider_name}
                      </span>
                    )}
                  </div>
                  <RemainingValueBlock server={server} />
                </section>
              )}

              {!!server.return_routes?.length && (
                <section className="detail-panel">
                  <h3>回程路由</h3>
                  <ReturnRouteBadges routes={server.return_routes} telecomPaidPeer={server.telecom_paid_peer} />
                </section>
              )}
            </div>
          </div>

          {!!ping.length && (
            <section className="detail-panel detail-panel-wide">
              <h3>延迟趋势</h3>
              <div className="detail-ping-picker">
                <Wifi size={14} />
                <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                  <option value="__avg__">平均</option>
                  {ping.map((item) => (
                    <option key={item.key || item.label} value={item.key || item.label}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <PingTrendChart serverIndex={index} initial={lines} targetKey={selected} />
            </section>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
