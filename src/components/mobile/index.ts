/**
 * Mobile Components - Exports
 * Composants optimisés pour l'expérience mobile Android
 */

// UI Components
export { ToastProvider, useToast } from './MobileToast';
export { ScrollToBottom } from './ScrollToBottom';
export { MessageBubble } from './MessageBubble';
export { Skeleton, MessageSkeleton, ConversationSkeleton, TypingIndicator } from './SkeletonLoader';
export { PullToRefresh } from './PullToRefresh';
export { ConnectionIndicator } from './ConnectionIndicator';
export { SwipeableItem } from '../chat/SwipeableItem';

// Android Gestures
export { useAndroidGestures, useEdgeSwipe } from './AndroidGestures';

// New Mobile Features (Android Improvements)
export { CameraButton } from './CameraButton';
export { TTSButton } from './TTSButton';
export { ShareButton } from './ShareButton';
export { ThemeToggle } from './ThemeToggle';
export { NetworkIndicator, NetworkBanner } from './NetworkIndicator';

// Animations
export {
  FadeIn,
  SlideIn,
  ScaleIn,
  StaggeredList,
  Pulse,
  Skeleton as AnimatedSkeleton,
  MessageAnimation,
  RippleButton,
  Bounce,
} from './AnimatedComponents';
