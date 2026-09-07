export const SESSION_ROUTE_PREFIX = '/'

/** The pathname of a router target. Every classifier reasons about the path only. */
export function routePathname(to: string): string {
  const cut = to.search(/[?#]/)

  return cut === -1 ? to : to.slice(0, cut)
}

export function sessionRoute(sessionId: string): string {
  return `${SESSION_ROUTE_PREFIX}${encodeURIComponent(sessionId)}`
}

export function routeSessionIdWithReserved(pathname: string, reservedPaths: ReadonlySet<string>): string | null {
  const path = routePathname(pathname)

  if (!path.startsWith(SESSION_ROUTE_PREFIX) || reservedPaths.has(path)) {
    return null
  }

  const id = path.slice(SESSION_ROUTE_PREFIX.length)

  if (!id || id.includes('/')) {
    return null
  }

  try {
    return decodeURIComponent(id)
  } catch {
    return null
  }
}
