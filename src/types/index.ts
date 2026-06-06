/**
 * Shared TypeScript types for WAGR.
 */

// ============================================================
//  Bet Types
// ============================================================

export enum BetStatus {
  Open = 0,
  Active = 1,
  Resolved = 2,
  Cancelled = 3,
}

export interface Bet {
  id: bigint;
  creator: `0x${string}`;
  opponent: `0x${string}`;
  judge: `0x${string}`;
  amount: bigint;
  condition: string;
  deadline: bigint;
  status: BetStatus;
  winner: `0x${string}`;
}

// ============================================================
//  Game Types
// ============================================================

export interface DailyGameState {
  question: string;
  options: string[];
  deadline: bigint;
  totalPool: bigint;
  roundId: bigint;
  isActive: boolean;
  isRevealed: boolean;
  correctAnswerIndex: number;
  totalParticipants: bigint;
}

// ============================================================
//  API Types
// ============================================================

export interface GeneratedQuestion {
  question: string;
  options: string[];
  suggestedAnswer: number;
  category: string;
}

export interface DailyQuestionResponse {
  question: string;
  options: string[];
}

// ============================================================
//  UI Types
// ============================================================

export interface ToastOptions {
  type: "success" | "error" | "loading" | "info";
  message: string;
}

export interface StatsData {
  prizePool: string;
  activeBets: string;
  totalPaidOut: string;
}
