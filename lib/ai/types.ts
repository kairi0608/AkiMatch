import type { Availability } from "@/types/availability";
import type { Schedule } from "@/types/schedule";

export interface NaturalLanguageAvailabilityRequest {
  schedule: Schedule;
  participantId: string;
  text: string;
}

export interface NaturalLanguageAvailabilityResult {
  changes: Availability[];
  explanation: string;
}

export interface AvailabilityInterpreter {
  interpret(
    request: NaturalLanguageAvailabilityRequest,
  ): Promise<NaturalLanguageAvailabilityResult>;
}
