/**
 * Animation Variants Palette
 * Framer Motion animation presets for consistent UX across the application
 * 
 * Usage:
 * import { fadeInUp, slideIn } from '@/lib/animations';
 * <motion.div variants={fadeInUp} initial="hidden" animate="visible" />
 */

import { Variants, Transition } from 'framer-motion';

// ============================================================================
// CORE TRANSITIONS
// ============================================================================

/**
 * Smooth, premium feel transition (default)
 */
export const smoothTransition: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
};

/**
 * Snappy, responsive transition
 */
export const snappyTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

/**
 * Gentle, organic transition
 */
export const gentleTransition: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
};

/**
 * Bouncy, playful transition
 */
export const bouncyTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 25,
  mass: 0.5,
};

/**
 * Ease-based transition (for simple animations)
 */
export const easeTransition: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1], // cubic-bezier
};

/**
 * Fast ease transition
 */
export const fastEaseTransition: Transition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
};

/**
 * Slow, dramatic transition
 */
export const dramaticTransition: Transition = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1],
};

// ============================================================================
// PAGE TRANSITION VARIANTS (For tab switching)
// ============================================================================

/**
 * Fade In/Out - Clean and simple
 * Best for: Tab content, overlays, modals
 */
export const fadeVariants: Variants = {
  hidden: { 
    opacity: 0,
  },
  visible: { 
    opacity: 1,
    transition: easeTransition,
  },
  exit: { 
    opacity: 0,
    transition: fastEaseTransition,
  },
};

/**
 * Fade + Slide Up - Modern, upward reveal
 * Best for: Page transitions, major content blocks
 */
export const fadeInUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: smoothTransition,
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: fastEaseTransition,
  },
};

/**
 * Fade + Slide Down - Dropdown effect
 * Best for: Dropdowns, notifications
 */
export const fadeInDown: Variants = {
  hidden: { 
    opacity: 0, 
    y: -20,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: smoothTransition,
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: fastEaseTransition,
  },
};

/**
 * Slide from Right - Navigation feel
 * Best for: Admin tab transitions (forward movement)
 */
export const slideInRight: Variants = {
  hidden: { 
    opacity: 0, 
    x: 40,
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: smoothTransition,
  },
  exit: { 
    opacity: 0, 
    x: -40,
    transition: fastEaseTransition,
  },
};

/**
 * Slide from Left - Back navigation
 * Best for: Admin tab transitions (backward movement)
 */
export const slideInLeft: Variants = {
  hidden: { 
    opacity: 0, 
    x: -40,
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: smoothTransition,
  },
  exit: { 
    opacity: 0, 
    x: 40,
    transition: fastEaseTransition,
  },
};

/**
 * Scale + Fade - Zooming effect
 * Best for: Modals, popovers, cards
 */
export const scaleIn: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: smoothTransition,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: fastEaseTransition,
  },
};

/**
 * Scale + Fade (from center) - Dramatic reveal
 * Best for: Important modals, success states
 */
export const scaleInCenter: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: bouncyTransition,
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: fastEaseTransition,
  },
};

// ============================================================================
// COMPONENT-SPECIFIC VARIANTS
// ============================================================================

/**
 * Card variants - Subtle lift and fade
 * Best for: Pool cards, metric cards, dashboard widgets
 */
export const cardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: smoothTransition,
  },
  hover: {
    y: -4,
    scale: 1.02,
    transition: snappyTransition,
  },
  tap: {
    scale: 0.98,
    transition: fastEaseTransition,
  },
};

/**
 * List item variants - Staggered reveal
 * Best for: Lists of pools, claims, transactions
 */
export const listItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -20,
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: smoothTransition,
  },
  hover: {
    x: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    transition: snappyTransition,
  },
};

/**
 * Staggered container - Parent for list items
 * Best for: Wrapping multiple list items
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/**
 * Modal backdrop variants
 * Best for: Modal overlays
 */
export const backdropVariants: Variants = {
  hidden: { 
    opacity: 0,
  },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

/**
 * Modal content variants - Scale + fade from bottom
 * Best for: Modal windows, dialogs
 */
export const modalVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
    transition: fastEaseTransition,
  },
};

/**
 * Button variants - Interactive feedback
 * Best for: Buttons, clickable elements
 */
export const buttonVariants: Variants = {
  hover: {
    scale: 1.05,
    transition: snappyTransition,
  },
  tap: {
    scale: 0.95,
    transition: fastEaseTransition,
  },
};

/**
 * Pulse animation - Attention grabber
 * Best for: Notifications, new updates badge
 */
export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Skeleton loading variants - Shimmer effect
 * Best for: Loading states
 */
export const skeletonVariants: Variants = {
  loading: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================================================
// METRIC/STAT VARIANTS
// ============================================================================

/**
 * Counter number animation
 * Best for: Animated counters, metrics
 */
export const counterVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.5,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: bouncyTransition,
  },
};

/**
 * Progress bar variants
 * Best for: Progress indicators, completion bars
 */
export const progressVariants: Variants = {
  hidden: { 
    scaleX: 0,
    originX: 0,
  },
  visible: { 
    scaleX: 1,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// ============================================================================
// NOTIFICATION/TOAST VARIANTS
// ============================================================================

/**
 * Toast/Notification - Slide from top
 * Best for: Success/error toasts
 */
export const toastVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -100,
    scale: 0.8,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    },
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.95,
    transition: fastEaseTransition,
  },
};

// ============================================================================
// ADMIN TAB SPECIFIC VARIANTS
// ============================================================================

/**
 * Overview Tab - Fade + slight zoom
 * Premium, welcoming feeling
 */
export const overviewTabVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.98,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: dramaticTransition,
  },
  exit: { 
    opacity: 0,
    scale: 1.02,
    transition: fastEaseTransition,
  },
};

/**
 * Pools Tab - Slide in from right
 * Forward navigation feel
 */
export const poolsTabVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: 60,
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: smoothTransition,
  },
  exit: { 
    opacity: 0,
    x: -60,
    transition: fastEaseTransition,
  },
};

/**
 * Claims Tab - Fade + slide up
 * Data-heavy, organized feeling
 */
export const claimsTabVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: smoothTransition,
  },
  exit: { 
    opacity: 0,
    y: -30,
    transition: fastEaseTransition,
  },
};

/**
 * Treasury Tab - Scale in (important content)
 * Financial focus, attention-grabbing
 */
export const treasuryTabVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: smoothTransition,
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    transition: fastEaseTransition,
  },
};

/**
 * Settings Tab - Fade only (subtle)
 * Secondary importance
 */
export const settingsTabVariants: Variants = {
  hidden: { 
    opacity: 0,
  },
  visible: { 
    opacity: 1,
    transition: easeTransition,
  },
  exit: { 
    opacity: 0,
    transition: fastEaseTransition,
  },
};

// ============================================================================
// UTILITY ANIMATIONS
// ============================================================================

/**
 * Spin animation - Loading indicator
 */
export const spinVariants: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Shake animation - Error state
 */
export const shakeVariants: Variants = {
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
    },
  },
};

/**
 * Bounce animation - Success state
 */
export const bounceVariants: Variants = {
  bounce: {
    y: [0, -20, 0],
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

// ============================================================================
// PRESET COMBINATIONS
// ============================================================================

/**
 * Page transition presets mapped to admin sections
 */
export const adminTabAnimations = {
  overview: overviewTabVariants,
  pools: poolsTabVariants,
  claims: claimsTabVariants,
  treasury: treasuryTabVariants,
  settings: settingsTabVariants,
};

/**
 * Component type presets
 */
export const componentAnimations = {
  card: cardVariants,
  listItem: listItemVariants,
  modal: modalVariants,
  button: buttonVariants,
  toast: toastVariants,
};

/**
 * Utility animation presets
 */
export const utilityAnimations = {
  spin: spinVariants,
  shake: shakeVariants,
  bounce: bounceVariants,
  pulse: pulseVariants,
};
