/**
 * Animated Wrapper Components
 * Reusable components with pre-configured Framer Motion animations
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import {
  fadeInUp,
  fadeVariants,
  slideInRight,
  scaleIn,
  cardVariants,
  listItemVariants,
  staggerContainer,
  modalVariants,
  backdropVariants,
  adminTabAnimations,
} from '@/lib/animations';

// ============================================================================
// BASIC ANIMATED CONTAINERS
// ============================================================================

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * FadeIn - Simple fade in animation
 * Usage: <FadeIn>content</FadeIn>
 */
export function FadeIn({ children, className, delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideUp - Fade + slide up animation
 * Usage: <SlideUp>content</SlideUp>
 */
export function SlideUp({ children, className, delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideRight - Slide in from right
 * Usage: <SlideRight>content</SlideRight>
 */
export function SlideRight({ children, className, delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      variants={slideInRight}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScaleIn - Scale + fade animation
 * Usage: <ScaleIn>content</ScaleIn>
 */
export function ScaleIn({ children, className, delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// COMPONENT-SPECIFIC WRAPPERS
// ============================================================================

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
}

/**
 * AnimatedCard - Card with hover effects
 * Usage: <AnimatedCard>card content</AnimatedCard>
 */
export function AnimatedCard({ children, className, onClick, delay = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedList - Staggered list container
 * Usage: <AnimatedList><AnimatedListItem>item</AnimatedListItem></AnimatedList>
 */
export function AnimatedList({ children, className }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedListItem - List item with hover effect
 * Usage: <AnimatedListItem>item content</AnimatedListItem>
 */
export function AnimatedListItem({ children, className, onClick }: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      variants={listItemVariants}
      whileHover="hover"
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// PAGE/TAB TRANSITIONS
// ============================================================================

interface AdminTabWrapperProps {
  children: ReactNode;
  tabName: 'overview' | 'pools' | 'claims' | 'treasury' | 'settings';
  className?: string;
}

/**
 * AdminTabWrapper - Animated wrapper for admin tab content
 * Usage: <AdminTabWrapper tabName="pools">tab content</AdminTabWrapper>
 */
export function AdminTabWrapper({ children, tabName, className }: AdminTabWrapperProps) {
  const variants = adminTabAnimations[tabName];
  
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

/**
 * PageTransition - Generic page transition wrapper with AnimatePresence
 * Usage: <PageTransition key={uniqueKey}>page content</PageTransition>
 */
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  mode?: 'wait' | 'sync' | 'popLayout';
}

export function PageTransition({ 
  children, 
  className,
  mode = 'wait' 
}: PageTransitionProps) {
  return (
    <AnimatePresence mode={mode}>
      <motion.div
        className={className}
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// MODAL/OVERLAY COMPONENTS
// ============================================================================

interface AnimatedModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * AnimatedModal - Modal with backdrop and smooth animations
 * Usage: <AnimatedModal isOpen={open} onClose={handleClose}>modal content</AnimatedModal>
 */
export function AnimatedModal({ children, isOpen, onClose, className }: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              className={className}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// UTILITY WRAPPERS
// ============================================================================

interface AnimatedButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * AnimatedButton - Button with hover/tap feedback
 * Usage: <AnimatedButton onClick={handleClick}>Click me</AnimatedButton>
 */
export function AnimatedButton({ 
  children, 
  className, 
  onClick, 
  disabled,
  type = 'button'
}: AnimatedButtonProps) {
  return (
    <motion.button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.button>
  );
}

/**
 * Stagger children animation helper
 */
interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerChildren({ 
  children, 
  className,
  staggerDelay = 0.05 
}: StaggerChildrenProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// LOADING/SKELETON COMPONENTS
// ============================================================================

interface LoadingSkeletonProps {
  className?: string;
}

/**
 * LoadingSkeleton - Animated loading skeleton
 * Usage: <LoadingSkeleton className="h-20 w-full" />
 */
export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <motion.div
      className={`bg-white/5 rounded ${className}`}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

/**
 * SpinningLoader - Spinning loading indicator
 * Usage: <SpinningLoader />
 */
export function SpinningLoader({ className }: LoadingSkeletonProps) {
  return (
    <motion.div
      className={`w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full ${className}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

// ============================================================================
// NOTIFICATION/TOAST WRAPPER
// ============================================================================

interface AnimatedToastProps {
  children: ReactNode;
  isVisible: boolean;
  className?: string;
}

/**
 * AnimatedToast - Toast notification with slide animation
 * Usage: <AnimatedToast isVisible={show}>notification content</AnimatedToast>
 */
export function AnimatedToast({ children, isVisible, className }: AnimatedToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={className}
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// ROUTE/TAB TRANSITION WRAPPER (For Admin Dashboard)
// ============================================================================

interface RouteTransitionProps {
  children: ReactNode;
  routeKey: string; // Unique key for the route
  className?: string;
}

/**
 * RouteTransition - Smooth transitions between routes/tabs
 * Usage: <RouteTransition routeKey={currentTab}>content</RouteTransition>
 */
export function RouteTransition({ children, routeKey, className }: RouteTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        className={className}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
