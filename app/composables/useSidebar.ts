import { computed } from 'vue'

export function useSidebar() {
  const isCollapsed = useState<boolean>('app-sidebar-is-collapsed', () => false)

  function toggleCollapse() {
    isCollapsed.value = !isCollapsed.value
  }

  function setCollapse(value: boolean) {
    isCollapsed.value = value
  }

  return {
    isCollapsed,
    toggleCollapse,
    setCollapse,
  }
}