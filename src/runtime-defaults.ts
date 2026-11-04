import { PING_GROUP_SCRIPT_VARS } from './ping-groups'
import { DEFAULT_NETWORK_SPEED_UNIT } from './network-speed'
import { DEFAULT_SHOW_CONNECTION_CHART } from './connection-chart'

export { SETUP_PLACEHOLDER } from './probe-setup'

export const RUNTIME_SCRIPT_VARS = {
  ...PING_GROUP_SCRIPT_VARS,
  PROBE_NETWORK_SPEED_UNIT: DEFAULT_NETWORK_SPEED_UNIT,
  PROBE_SHOW_CONNECTION_CHART: String(DEFAULT_SHOW_CONNECTION_CHART),
  PROBE_BACKGROUND_URL: '/images/status-wallpaper.jpg',
  PROBE_BACKGROUND_OVERLAY: '0.01',
  PROBE_BACKGROUND_POSITION: 'center',
  PROBE_BACKGROUND_THEMES: 'pixel,flat,anime,glass,lumina,luminaplus,premium,ran,glassmorphism,emerald',
}
