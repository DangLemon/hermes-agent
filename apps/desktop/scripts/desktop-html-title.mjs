import { loadHarnessConfigInput } from './internal-desktop-harness.mjs'

const TITLE_PLACEHOLDER = '%HERMES_DESKTOP_APP_TITLE%'
const ICON_PLACEHOLDER = '%HERMES_DESKTOP_APP_ICON%'

export function desktopHtmlTitleForEnv(env = process.env) {
  try {
    return loadHarnessConfigInput(env) ? 'Lemon AI' : 'Hermes'
  } catch {
    return 'Hermes'
  }
}

export function desktopHtmlTitlePlugin(env = process.env) {
  const title = desktopHtmlTitleForEnv(env)
  const icon = title === 'Lemon AI' ? 'lemon-apple-touch-icon.png' : 'apple-touch-icon.png'

  return {
    name: 'hermes:desktop-html-title',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replaceAll(TITLE_PLACEHOLDER, title).replaceAll(ICON_PLACEHOLDER, icon)
      }
    }
  }
}
