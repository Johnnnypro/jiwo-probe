import { useEffect, useRef } from 'react'
import type { ProbePayload } from '../types'
import { footerLicenseBadges } from '../license-badges'
import { startNameplateMotion } from '../license-nameplate-motion'

export function ProbeLicenseNameplate({ name, displayName, animated = true }: { name?: string; displayName?: string; animated?: boolean }) {
  const label = [name?.trim(), displayName?.trim()].filter(Boolean).join(' · ')
  const plateRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const starsRef = useRef<HTMLSpanElement>(null)
  const shineRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!animated) return
    const plate = plateRef.current
    const text = textRef.current
    const inner = innerRef.current
    const stars = starsRef.current
    const shine = shineRef.current
    if (!plate || !text || !inner || !stars || !shine) return
    const palette = document.documentElement.classList.contains('platinum') && !plate.closest('.probe-license-footer')
      ? ['#8c5d17', '#d7a63d', '#f2d78a', '#fff1b9', '#c78e24']
      : ['#f2d28b', '#d8b46a', '#e0b96e', '#f5c542', '#f3ecdc']
    return startNameplateMotion({ plate, text, inner, stars, shine }, palette)
  }, [animated])

  if (!label) return null
  return (
    <span ref={plateRef} className="probe-license-nameplate" data-animated={animated} style={animated ? undefined : { opacity: 1, transform: 'none', willChange: 'auto' }}>
      <strong ref={textRef} className="probe-license-text"><span ref={innerRef}>{label}</span></strong>
      {animated && <span className="probe-license-shine-clip" aria-hidden="true">
        <span ref={shineRef} className="probe-license-shine" />
      </span>}
      {animated && <span ref={starsRef} className="probe-license-stars" aria-hidden="true" />}
    </span>
  )
}


export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// 共用原有名牌与动画，独立主题不再遗漏许可证页尾。
export function ProbeLicenseFooter({ badges, animated = true }: { badges: ProbePayload['license_badge']; animated?: boolean }) {
  const list = footerLicenseBadges(badges)
  if (!list.length) return null
  // 系统开启「减少动态效果」时直接显示静态铭牌（无障碍；README 截图也依赖这一点）
  const motion = animated && !prefersReducedMotion()
  return <div className="probe-license-footer">
    {list.map((badge, index) => <ProbeLicenseNameplate key={index} name={badge.name} displayName={badge.display_name} animated={motion} />)}
  </div>
}
