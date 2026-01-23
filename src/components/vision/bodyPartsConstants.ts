/**
 * Body Parts Detection Constants
 * Shared constants for body pose detection and visualization
 */

import { Eye, Hand, Footprints, User } from 'lucide-react';

// Body landmark indices from MediaPipe Pose (33 landmarks)
export const BODY_LANDMARKS = {
  // Face
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  leftEyeOuter: 3,
  rightEyeInner: 4,
  rightEye: 5,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  
  // Upper body
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  
  // Hands
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  
  // Lower body
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

// Body part groups for display
export const BODY_GROUPS = {
  head: {
    name: 'Tête',
    icon: Eye,
    color: '#3b82f6',
    landmarks: ['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar', 'mouthLeft', 'mouthRight'],
  },
  torso: {
    name: 'Torse',
    icon: User,
    color: '#8b5cf6',
    landmarks: ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'],
  },
  leftArm: {
    name: 'Bras Gauche',
    icon: Hand,
    color: '#10b981',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist', 'leftPinky', 'leftIndex', 'leftThumb'],
  },
  rightArm: {
    name: 'Bras Droit',
    icon: Hand,
    color: '#f59e0b',
    landmarks: ['rightShoulder', 'rightElbow', 'rightWrist', 'rightPinky', 'rightIndex', 'rightThumb'],
  },
  leftLeg: {
    name: 'Jambe Gauche',
    icon: Footprints,
    color: '#ef4444',
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle', 'leftHeel', 'leftFootIndex'],
  },
  rightLeg: {
    name: 'Jambe Droite',
    icon: Footprints,
    color: '#ec4899',
    landmarks: ['rightHip', 'rightKnee', 'rightAnkle', 'rightHeel', 'rightFootIndex'],
  },
};

// Landmark names in French
export const LANDMARK_NAMES: Record<string, string> = {
  nose: 'Nez',
  leftEyeInner: 'Œil G (int)',
  leftEye: 'Œil Gauche',
  leftEyeOuter: 'Œil G (ext)',
  rightEyeInner: 'Œil D (int)',
  rightEye: 'Œil Droit',
  rightEyeOuter: 'Œil D (ext)',
  leftEar: 'Oreille Gauche',
  rightEar: 'Oreille Droite',
  mouthLeft: 'Bouche (G)',
  mouthRight: 'Bouche (D)',
  leftShoulder: 'Épaule Gauche',
  rightShoulder: 'Épaule Droite',
  leftElbow: 'Coude Gauche',
  rightElbow: 'Coude Droit',
  leftWrist: 'Poignet Gauche',
  rightWrist: 'Poignet Droit',
  leftPinky: 'Auriculaire G',
  rightPinky: 'Auriculaire D',
  leftIndex: 'Index Gauche',
  rightIndex: 'Index Droit',
  leftThumb: 'Pouce Gauche',
  rightThumb: 'Pouce Droit',
  leftHip: 'Hanche Gauche',
  rightHip: 'Hanche Droite',
  leftKnee: 'Genou Gauche',
  rightKnee: 'Genou Droit',
  leftAnkle: 'Cheville Gauche',
  rightAnkle: 'Cheville Droite',
  leftHeel: 'Talon Gauche',
  rightHeel: 'Talon Droit',
  leftFootIndex: 'Pied Gauche',
  rightFootIndex: 'Pied Droit',
};

// Pose connections for skeleton drawing
export const POSE_CONNECTIONS = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

// Colors for skeleton drawing
export const SKELETON_COLORS = {
  head: '#3b82f6',
  torso: '#8b5cf6',
  leftArm: '#10b981',
  rightArm: '#f59e0b',
  leftLeg: '#ef4444',
  rightLeg: '#ec4899',
  default: '#8b5cf6',
};

// Get segment color based on connection indices
export function getSegmentColor(startIdx: number, endIdx: number): string {
  // Head connections
  if (startIdx <= 10 && endIdx <= 10) return SKELETON_COLORS.head;
  // Torso
  if ([11, 12, 23, 24].includes(startIdx) && [11, 12, 23, 24].includes(endIdx)) {
    return SKELETON_COLORS.torso;
  }
  // Left arm
  if ([11, 13, 15, 17, 19, 21].includes(startIdx) && [11, 13, 15, 17, 19, 21].includes(endIdx)) {
    return SKELETON_COLORS.leftArm;
  }
  // Right arm
  if ([12, 14, 16, 18, 20, 22].includes(startIdx) && [12, 14, 16, 18, 20, 22].includes(endIdx)) {
    return SKELETON_COLORS.rightArm;
  }
  // Left leg
  if ([23, 25, 27, 29, 31].includes(startIdx) && [23, 25, 27, 29, 31].includes(endIdx)) {
    return SKELETON_COLORS.leftLeg;
  }
  // Right leg
  if ([24, 26, 28, 30, 32].includes(startIdx) && [24, 26, 28, 30, 32].includes(endIdx)) {
    return SKELETON_COLORS.rightLeg;
  }
  return SKELETON_COLORS.default;
}

// Types
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface BodyGroupStatus {
  name: string;
  icon: React.ElementType;
  color: string;
  visible: number;
  total: number;
  avgVisibility: number;
  landmarks: Array<{
    name: string;
    key: string;
    visible: boolean;
    visibility: number;
    position: { x: number; y: number; z: number };
  }>;
}

export interface PoseAnalysis {
  posture: string;
  isLeaning: boolean;
  leanDirection: string;
  leftArmRaised: boolean;
  rightArmRaised: boolean;
  torsoLength: number;
}
