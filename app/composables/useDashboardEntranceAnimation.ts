import { ref, watch, nextTick, onMounted, onUnmounted, type Ref } from 'vue'
import { gsap } from 'gsap'

export interface DashboardEntranceAnimationOptions {
  /**
   * CSS selector for the section elements to animate within the container.
   * If omitted, prioritizes [data-animate-section], then direct children:
   * ':scope > header, :scope > section, :scope > div:not([aria-hidden="true"])'
   */
  targetSelector?: string
  /**
   * Ref indicating whether the asynchronous data/content is ready to be animated.
   * If not provided, assumes ready on mount.
   */
  isReady?: Ref<boolean>
  /**
   * Duration in seconds for each element animation. Default: 0.55s
   */
  duration?: number
  /**
   * Stagger delay between elements in seconds. Default: 0.06s
   */
  stagger?: number
  /**
   * Vertical distance in pixels to travel upwards. Default: 16px
   */
  yOffset?: number
  /**
   * GSAP ease string. Default: 'power2.out'
   */
  ease?: string
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useDashboardEntranceAnimation(
  containerRef: Ref<HTMLElement | null | undefined>,
  options: DashboardEntranceAnimationOptions = {}
) {
  const {
    targetSelector,
    isReady,
    duration = 0.55,
    stagger = 0.06,
    yOffset = 16,
    ease = 'power2.out',
  } = options

  const hasAnimated = ref(false)
  let activeTween: gsap.core.Tween | null = null

  function getTargetElements(): HTMLElement[] {
    const container = containerRef.value
    if (!container) return []

    // If explicit targetSelector provided, query using it
    if (targetSelector) {
      return Array.from(container.querySelectorAll<HTMLElement>(targetSelector))
    }

    // 1. Look for explicit [data-animate-section] items
    const explicitSections = Array.from(container.querySelectorAll<HTMLElement>('[data-animate-section]'))
    if (explicitSections.length > 0) {
      // Filter out any nested [data-animate-section] whose parent already has [data-animate-section]
      return explicitSections.filter((el) => {
        const parentSection = el.parentElement?.closest('[data-animate-section]')
        return !parentSection
      })
    }

    // 2. Fallback to direct top-level semantic children
    const directChildren = Array.from(
      container.querySelectorAll<HTMLElement>(':scope > header, :scope > section, :scope > div:not([aria-hidden="true"])')
    )
    return directChildren.filter((el) => {
      if (el.getAttribute('aria-hidden') === 'true') return false
      return true
    })
  }

  function animateEntrance() {
    if (hasAnimated.value) return
    if (!containerRef.value) return

    if (prefersReducedMotion()) {
      hasAnimated.value = true
      return
    }

    const elements = getTargetElements()
    if (elements.length === 0) return

    hasAnimated.value = true

    gsap.killTweensOf(elements)

    activeTween = gsap.fromTo(
      elements,
      {
        opacity: 0,
        y: yOffset,
      },
      {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        ease,
        clearProps: 'all',
        onComplete: () => {
          activeTween = null
        },
      }
    )
  }

  onMounted(() => {
    nextTick(() => {
      if (!isReady || isReady.value) {
        animateEntrance()
      }
    })
  })

  if (isReady) {
    watch(
      isReady,
      (ready) => {
        if (ready && !hasAnimated.value) {
          nextTick(() => {
            animateEntrance()
          })
        }
      },
      { flush: 'post' }
    )
  }

  onUnmounted(() => {
    if (activeTween) {
      activeTween.kill()
      activeTween = null
    }
    const elements = getTargetElements()
    if (elements.length > 0) {
      gsap.killTweensOf(elements)
      gsap.set(elements, { clearProps: 'all' })
    }
  })

  return {
    hasAnimated,
    animateEntrance,
    getTargetElements,
  }
}
