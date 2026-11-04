import type { ProbePayload } from './types'

// 页脚固定展示顺序。
export const EXTRA_LICENSE_BADGES: { name: string; display_name: string }[] = [
  { name: '👑 幸运EX', display_name: '🌠 天选之子' },
  { name: '💍「誓约」· 白誓之印', display_name: '🎉 妙妙屋X上线纪念' },
  { name: '✨ 初曦', display_name: '🌟 超前赞助许可证' },
  { name: '💎 永恒之契', display_name: '妙妙屋X贡献者' },
]

export function footerLicenseBadges(badges: ProbePayload['license_badge']) {
  if (EXTRA_LICENSE_BADGES.length) return EXTRA_LICENSE_BADGES
  const live = Array.isArray(badges) ? badges : badges ? [badges] : []
  const key = (badge: (typeof live)[number]) => badge.name || badge.display_name || ''
  return live.filter((badge, index) => live.findIndex((item) => key(item) === key(badge)) === index)
}

// 页首循环播放的完整许可证列表(本地专属, git filter 剥离)。
export const HEADER_LICENSE_BADGES: { name: string; display_name: string }[] = []
