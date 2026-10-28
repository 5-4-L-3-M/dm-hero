import type { LoadStatus } from '~~/types/inventory'

/** Vuetify color for a carrying-load status. */
export function loadStatusColor(status: LoadStatus): string {
  switch (status) {
    case 'normal': return 'success'
    case 'encumbered': return 'warning'
    case 'heavy': return 'deep-orange'
    case 'over': return 'error'
    default: return 'grey'
  }
}

/** MDI icon for a carrying-load status. */
export function loadStatusIcon(status: LoadStatus): string {
  switch (status) {
    case 'normal': return 'mdi-check-circle'
    case 'encumbered': return 'mdi-weight'
    case 'heavy': return 'mdi-weight-lifter'
    case 'over': return 'mdi-alert-octagon'
    default: return 'mdi-help-circle-outline'
  }
}
