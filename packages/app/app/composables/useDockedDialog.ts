import { useDisplay } from 'vuetify'

/**
 * A dialog that leaves the entity side panel usable: no dark backdrop,
 * focus not trapped, clicks outside don't close it, and when the panel
 * is open the dialog moves left so both fit side by side.
 *
 * Usage:
 *   const { dockAttrs, dockOutside, dockAccept } = useDockedDialog(720)
 *   <v-dialog v-bind="dockAttrs" @click:outside="dockOutside" @update:model-value="v => dockAccept(v) && emit(...)">
 */
export function useDockedDialog(baseWidth: number) {
  const tabs = useEntityTabsStore()
  const { width } = useDisplay()

  const panel = computed(() => (tabs.panelOpen ? (tabs.wide ? 720 : 460) : 0))

  const dockAttrs = computed(() => ({
    scrim: false,
    retainFocus: false,
    maxWidth: panel.value ? Math.max(360, Math.min(baseWidth, width.value - panel.value - 48)) : baseWidth,
    contentClass: panel.value ? 'docked-dialog docked-dialog--beside' : 'docked-dialog',
    contentProps: { style: panel.value ? { marginRight: `${panel.value + 24}px` } : {} },
  }))

  // Vuetify reports the outside click first, then asks to close — ignore that close
  let outside = false
  function dockOutside() {
    outside = true
    setTimeout(() => (outside = false))
  }
  function dockAccept(value: boolean) {
    if (!value && outside) {
      outside = false
      return false
    }
    return true
  }

  return { dockAttrs, dockOutside, dockAccept }
}
