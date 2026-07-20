export type PulseCode = 'LEADER_PULSE' | 'TALENT_PULSE' | 'SYSTEM_PULSE' | 'GROWTH_PULSE';
export type PulseState = 'LOCKED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface PulseInfo {
  pulseCode: PulseCode;
  state: PulseState;
  sessionId: string | null;
  completedAt: string | null;
}

export interface PulseStatusResponse {
  orderId: string;
  pulses: PulseInfo[];
  allCompleted: boolean;
}

export interface PulseSubmitResponse {
  sessionId: string;
  pulseCode: PulseCode;
  status: string;
  allPulsesCompleted: boolean;
}
