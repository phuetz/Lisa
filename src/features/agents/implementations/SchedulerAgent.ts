/**
 * SchedulerAgent - Intelligent Scheduling and Availability Management
 * 
 * Optimizes scheduling by analyzing availability and suggesting optimal time slots
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { AgentDomains } from '../core/types';

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  score: number; // 0-100 optimization score
}

interface ScheduleSuggestion {
  timeSlot: TimeSlot;
  reason: string;
  confidence: number;
  alternatives: TimeSlot[];
}

export class SchedulerAgent implements BaseAgent {
  name = 'SchedulerAgent';
  description = 'Optimizes scheduling with availability analysis and smart time slot suggestions';
  version = '1.0.0';
  domain: AgentDomain = AgentDomains.PRODUCTIVITY;
  capabilities = [
    'availability_analysis',
    'time_optimization',
    'meeting_scheduling',
    'conflict_detection',
    'smart_suggestions',
    'calendar_integration'
  ];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { intent, parameters } = props;

    try {
      switch (intent) {
        case 'find_availability':
          return await this.findAvailability(parameters);
        
        case 'suggest_time':
          return await this.suggestTime(parameters);
        
        case 'detect_conflicts':
          return await this.detectConflicts(parameters);
        
        case 'optimize_schedule':
          return await this.optimizeSchedule(parameters);
        
        case 'analyze_workload':
          return await this.analyzeWorkload(parameters);
        
        case 'schedule_meeting':
          return await this.scheduleMeeting(parameters);
        
        default:
          return {
            success: false,
            output: null,
            error: `Unknown intent: ${intent}`,
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  private async findAvailability(params: any): Promise<AgentExecuteResult> {
    const { startDate, endDate, duration = 60, participants: _participants = [] } = params;

    if (!startDate || !endDate) {
      return {
        success: false,
        output: null,
        error: 'Start and end dates are required'
      };
    }

    const slots: TimeSlot[] = this.generateTimeSlots(
      new Date(startDate),
      new Date(endDate),
      duration
    );

    return {
      success: true,
      output: {
        availableSlots: slots.filter(s => s.available),
        totalSlots: slots.length,
        bestSlot: slots.sort((a, b) => b.score - a.score)[0]
      },
      metadata: {
        source: 'SchedulerAgent',
        timestamp: Date.now()
      }
    };
  }

  private async suggestTime(params: any): Promise<AgentExecuteResult> {
    const { purpose: _purpose, duration = 60, preferredTimeOfDay, urgency = 'normal' } = params;

    const now = new Date();
    const suggestions: ScheduleSuggestion[] = [];

    // Generate suggestions based on preferences
    if (preferredTimeOfDay === 'morning') {
      suggestions.push(this.createSuggestion(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0),
        duration,
        'Optimal morning time for focused work',
        0.9
      ));
    } else if (preferredTimeOfDay === 'afternoon') {
      suggestions.push(this.createSuggestion(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0),
        duration,
        'Good afternoon slot after lunch',
        0.85
      ));
    } else {
      // Default suggestions
      suggestions.push(
        this.createSuggestion(
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0),
          duration,
          'Mid-morning - high productivity time',
          0.9
        ),
        this.createSuggestion(
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 30),
          duration,
          'Early afternoon - good for collaboration',
          0.8
        )
      );
    }

    return {
      success: true,
      output: {
        suggestions,
        primarySuggestion: suggestions[0],
        urgency
      },
      metadata: {
        source: 'SchedulerAgent',
        timestamp: Date.now()
      }
    };
  }

  private async detectConflicts(params: any): Promise<AgentExecuteResult> {
    const { events = [], newEvent } = params;

    if (!newEvent) {
      return {
        success: false,
        output: null,
        error: 'New event is required'
      };
    }

    const conflicts: any[] = [];
    const newStart = new Date(newEvent.start);
    const newEnd = new Date(newEvent.end);

    events.forEach((event: any) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      if (this.hasTimeOverlap(newStart, newEnd, eventStart, eventEnd)) {
        conflicts.push({
          event,
          overlapDuration: this.calculateOverlap(newStart, newEnd, eventStart, eventEnd),
          severity: this.calculateConflictSeverity(newEvent, event)
        });
      }
    });

    return {
      success: true,
      output: {
        hasConflicts: conflicts.length > 0,
        conflicts,
        conflictCount: conflicts.length,
        resolution: conflicts.length > 0 
          ? 'Reschedule one of the conflicting events' 
          : 'No conflicts detected'
      },
      metadata: {
        source: 'SchedulerAgent',
        timestamp: Date.now()
      }
    };
  }

  private async optimizeSchedule(params: any): Promise<AgentExecuteResult> {
    const { events = [], preferences: _preferences = {} } = params;

    const optimizations: any[] = [];

    // Analyze schedule for optimization opportunities
    events.forEach((event: any, index: number) => {
      // Check for back-to-back meetings
      if (index > 0) {
        const prevEvent = events[index - 1];
        const timeBetween = new Date(event.start).getTime() - new Date(prevEvent.end).getTime();
        
        if (timeBetween < 15 * 60 * 1000) { // Less than 15 minutes
          optimizations.push({
            type: 'add_buffer',
            event,
            suggestion: 'Add 15-minute buffer between meetings',
            impact: 'Reduces fatigue and allows for transitions'
          });
        }
      }

      // Check for long meetings
      const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
      if (duration > 90 * 60 * 1000) { // More than 90 minutes
        optimizations.push({
          type: 'split_meeting',
          event,
          suggestion: 'Consider splitting into multiple sessions',
          impact: 'Maintains attention and productivity'
        });
      }
    });

    return {
      success: true,
      output: {
        optimizations,
        optimizationScore: Math.max(0, 100 - (optimizations.length * 10)),
        suggestions: optimizations.map(o => o.suggestion)
      },
      metadata: {
        source: 'SchedulerAgent',
        timestamp: Date.now()
      }
    };
  }

  private async analyzeWorkload(params: any): Promise<AgentExecuteResult> {
    const { events = [], period = 'week' } = params;

    const totalMinutes = events.reduce((sum: number, event: any) => {
      const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
      return sum + (duration / 60000);
    }, 0);

    const hours = totalMinutes / 60;
    const avgPerDay = period === 'week' ? hours / 5 : hours / 30;

    let status: 'light' | 'moderate' | 'heavy' | 'overloaded';
    if (avgPerDay < 4) status = 'light';
    else if (avgPerDay < 6) status = 'moderate';
    else if (avgPerDay < 8) status = 'heavy';
    else status = 'overloaded';

    return {
      success: true,
      output: {
        totalHours: hours,
        averagePerDay: avgPerDay,
        status,
        recommendation: this.getWorkloadRecommendation(status),
        distribution: this.analyzeTimeDistribution(events)
      },
      metadata: {
        source: 'SchedulerAgent',
        timestamp: Date.now()
      }
    };
  }

  private async scheduleMeeting(params: any): Promise<AgentExecuteResult> {
    const { title, duration = 60, participants = [], preferences: _prefs = {} } = params;

    if (!title) {
      return {
        success: false,
        output: null,
        error: 'Meeting title is required'
      };
    }

    // Find best time slot
    const availabilityResult = await this.findAvailability({
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      duration,
      participants
    });

    if (!availabilityResult.success) {
      return availabilityResult;
    }

    const bestSlot = availabilityResult.output.bestSlot;

    return {
      success: true,
      output: {
        meeting: {
          title,
          start: bestSlot.start,
          end: bestSlot.end,
          duration,
          participants
        },
        alternatives: availabilityResult.output.availableSlots.slice(0, 3),
        confidence: bestSlot.score / 100
      },
      metadata: {
        source: 'SchedulerAgent',
        timestamp: Date.now()
      }
    };
  }

  // Helper methods

  private generateTimeSlots(start: Date, end: Date, duration: number): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const current = new Date(start);

    while (current < end) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      
      slots.push({
        start: new Date(current),
        end: slotEnd,
        available: this.isWorkingHours(current),
        score: this.calculateSlotScore(current)
      });

      current.setMinutes(current.getMinutes() + 30); // 30-minute intervals
    }

    return slots;
  }

  private isWorkingHours(date: Date): boolean {
    const hour = date.getHours();
    const day = date.getDay();
    
    // Monday to Friday, 9 AM to 6 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  }

  private calculateSlotScore(date: Date): number {
    let score = 50;

    // Prefer morning slots
    const hour = date.getHours();
    if (hour >= 9 && hour < 12) score += 30;
    else if (hour >= 14 && hour < 16) score += 20;
    else if (hour >= 16 && hour < 18) score += 10;

    // Prefer mid-week
    const day = date.getDay();
    if (day >= 2 && day <= 4) score += 20;

    return Math.min(score, 100);
  }

  private createSuggestion(start: Date, duration: number, reason: string, confidence: number): ScheduleSuggestion {
    const end = new Date(start.getTime() + duration * 60000);
    
    return {
      timeSlot: {
        start,
        end,
        available: true,
        score: confidence * 100
      },
      reason,
      confidence,
      alternatives: []
    };
  }

  private hasTimeOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  private calculateOverlap(start1: Date, end1: Date, start2: Date, end2: Date): number {
    const overlapStart = Math.max(start1.getTime(), start2.getTime());
    const overlapEnd = Math.min(end1.getTime(), end2.getTime());
    return Math.max(0, overlapEnd - overlapStart) / 60000; // in minutes
  }

  private calculateConflictSeverity(event1: any, event2: any): 'low' | 'medium' | 'high' {
    // Simple severity calculation
    if (event1.priority === 'high' || event2.priority === 'high') return 'high';
    if (event1.priority === 'medium' || event2.priority === 'medium') return 'medium';
    return 'low';
  }

  private getWorkloadRecommendation(status: string): string {
    const recommendations: Record<string, string> = {
      light: 'You have capacity for additional tasks',
      moderate: 'Well-balanced schedule',
      heavy: 'Consider delegating or rescheduling some tasks',
      overloaded: 'Urgent: Reduce commitments to avoid burnout'
    };
    return recommendations[status] || '';
  }

  private analyzeTimeDistribution(events: any[]): any {
    const categories: Record<string, number> = {
      meetings: 0,
      focus: 0,
      breaks: 0,
      other: 0
    };

    events.forEach(event => {
      const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
      const hours = duration / 3600000;
      
      const category = event.type || 'other';
      categories[category] = (categories[category] || 0) + hours;
    });

    return categories;
  }

  async canHandle(query: string, _context?: any): Promise<number> {
    const keywords = [
      'schedule', 'meeting', 'calendar', 'appointment', 'availability',
      'time', 'slot', 'book', 'reserve', 'plan', 'organize',
      'planifier', 'rendez-vous', 'disponibilité', 'réunion', 'horaire'
    ];

    const lowerQuery = query.toLowerCase();
    const matches = keywords.filter(keyword => lowerQuery.includes(keyword));
    
    return matches.length > 0 ? Math.min(matches.length * 0.3, 1.0) : 0.0;
  }
}
