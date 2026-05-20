// lib/supabase/types.ts
// Tipos generados de Supabase + tipos de dominio

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'
export type MatchPhase =
  | 'groups'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarterfinals'
  | 'semifinals'
  | 'third_place'
  | 'final'
export type UserRole = 'admin' | 'participant'
export type SyncSource = 'football_data' | 'thesportsdb' | 'openfootball' | 'manual' | 'cache'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          role: UserRole
          total_points: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      teams: {
        Row: {
          id: number
          name: string
          short_name: string
          flag_url: string | null
          group_letter: string | null
          fifa_code: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
        Relationships: []
      }
      matches: {
        Row: {
          id: number
          external_id: string | null
          match_number: number | null
          phase: MatchPhase
          home_team_id: number | null
          away_team_id: number | null
          home_score: number | null
          away_score: number | null
          match_date: string
          venue: string | null
          city: string | null
          status: MatchStatus
          lock_time: string | null
          last_synced_at: string | null
          sync_source: SyncSource | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'id' | 'created_at' | 'updated_at' | 'lock_time'>
        Update: Partial<Database['public']['Tables']['matches']['Insert']>
        Relationships: []
      }
      polls: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          invite_code: string
          is_public: boolean
          max_members: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['polls']['Row'], 'created_at' | 'updated_at' | 'invite_code'>
        Update: Partial<Database['public']['Tables']['polls']['Insert']>
        Relationships: []
      }
      poll_members: {
        Row: {
          id: number
          poll_id: string
          user_id: string
          points: number
          rank: number | null
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['poll_members']['Row'], 'id' | 'joined_at' | 'points' | 'rank'>
        Update: Partial<Database['public']['Tables']['poll_members']['Insert']>
        Relationships: []
      }
      predictions: {
        Row: {
          id: number
          user_id: string
          match_id: number
          poll_id: string
          home_score_pred: number
          away_score_pred: number
          points_earned: number
          is_calculated: boolean
          submitted_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['predictions']['Row'],
          'id' | 'submitted_at' | 'updated_at' | 'points_earned' | 'is_calculated'
        >
        Update: Partial<Database['public']['Tables']['predictions']['Insert']>
        Relationships: []
      }
      standings: {
        Row: {
          id: number
          poll_id: string
          user_id: string
          total_points: number
          exact_scores: number
          correct_winners: number
          correct_diffs: number
          predictions_made: number
          rank: number | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['standings']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['standings']['Insert']>
        Relationships: []
      }
      sync_logs: {
        Row: {
          id: number
          source: SyncSource
          matches_updated: number
          success: boolean
          error_message: string | null
          duration_ms: number | null
          synced_at: string
        }
        Insert: Omit<Database['public']['Tables']['sync_logs']['Row'], 'id' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['sync_logs']['Insert']>
        Relationships: []
      }
      admin_logs: {
        Row: {
          id: number
          admin_id: string
          action: string
          target_type: string | null
          target_id: string | null
          old_value: Record<string, unknown> | null
          new_value: Record<string, unknown> | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['admin_logs']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      calculate_prediction_points: {
        Args: { pred_home: number; pred_away: number; real_home: number; real_away: number }
        Returns: number
      }
      recalculate_poll_ranking: {
        Args: { p_poll_id: string }
        Returns: void
      }
      process_match_results: {
        Args: { p_match_id: number }
        Returns: number
      }
    }
    Enums: {
      match_status: MatchStatus
      match_phase: MatchPhase
      user_role: UserRole
      sync_source: SyncSource
    }
    CompositeTypes: Record<string, never>
  }
}

// Tipos de dominio para UI
export interface MatchWithTeams {
  id: number
  phase: MatchPhase
  matchDate: string
  lockTime: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  homeTeam: { name: string; shortName: string; flagUrl: string | null }
  awayTeam: { name: string; shortName: string; flagUrl: string | null }
  venue: string | null
  userPrediction?: { homeScore: number; awayScore: number; pointsEarned: number } | null
}

export interface PollWithMembers {
  id: string
  name: string
  description: string | null
  inviteCode: string
  isPublic: boolean
  memberCount: number
  myPoints: number
  myRank: number | null
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatarUrl: string | null
  totalPoints: number
  exactScores: number
  correctWinners: number
  predictionsMade: number
}
