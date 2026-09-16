/**
 * Generated from production Supabase (project eFootball).
 * Snapshot 2026-09-15 after notifications migrations (33 public tables, 10 RPCs).
 * Regenerate from production with Supabase `generate_typescript_types` before cutover.
 * Runtime traffic is dormant; these types describe the live production schema.
 * Do not put secrets in this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      card_advisor_cards: {
        Row: {
          age: number | null
          ai_playstyles: string[]
          base_stats: Json
          card_type: string | null
          category: string | null
          completeness_score: number
          created_at: string
          data_quality: string
          enrichment_status: string
          error_message: string | null
          fetched_at: string
          foot: string | null
          height: number | null
          id: string
          image_url: string | null
          is_active: boolean
          last_synced_at: string
          max_stats: Json
          overall_display: number | null
          player_name: string
          player_skills: string[]
          playing_style: string | null
          position: string | null
          position_compatibility: Json
          release_id: string
          source: string
          source_payload: Json
          source_player_id: string
          source_url: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          ai_playstyles?: string[]
          base_stats?: Json
          card_type?: string | null
          category?: string | null
          completeness_score?: number
          created_at?: string
          data_quality?: string
          enrichment_status?: string
          error_message?: string | null
          fetched_at?: string
          foot?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_synced_at?: string
          max_stats?: Json
          overall_display?: number | null
          player_name: string
          player_skills?: string[]
          playing_style?: string | null
          position?: string | null
          position_compatibility?: Json
          release_id: string
          source?: string
          source_payload?: Json
          source_player_id: string
          source_url?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          ai_playstyles?: string[]
          base_stats?: Json
          card_type?: string | null
          category?: string | null
          completeness_score?: number
          created_at?: string
          data_quality?: string
          enrichment_status?: string
          error_message?: string | null
          fetched_at?: string
          foot?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_synced_at?: string
          max_stats?: Json
          overall_display?: number | null
          player_name?: string
          player_skills?: string[]
          playing_style?: string | null
          position?: string | null
          position_compatibility?: Json
          release_id?: string
          source?: string
          source_payload?: Json
          source_player_id?: string
          source_url?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_advisor_cards_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "card_advisor_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      card_advisor_releases: {
        Row: {
          category: string | null
          created_at: string
          fetched_at: string
          id: string
          is_active: boolean
          last_synced_at: string
          release_date: string | null
          release_name: string
          source: string
          source_release_id: string
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string
          release_date?: string | null
          release_name: string
          source?: string
          source_release_id: string
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string
          release_date?: string | null
          release_name?: string
          source?: string
          source_release_id?: string
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_catalog: {
        Row: {
          boost_ids: Json
          catalog_ready: boolean
          category: string | null
          coach_name: string
          coach_name_ja: string | null
          coach_payload: Json
          connection: Json | null
          created_at: string
          id: string
          last_source_sync_at: string
          metadata: Json
          needs_review: boolean
          pack_type: string | null
          photo_slots: Json
          playing_style_competence: Json
          source: string
          source_card_image_url: string | null
          source_coach_id: string
          source_url: string | null
          source_version: string | null
          stat_boosters: Json
          updated_at: string
        }
        Insert: {
          boost_ids?: Json
          catalog_ready?: boolean
          category?: string | null
          coach_name: string
          coach_name_ja?: string | null
          coach_payload?: Json
          connection?: Json | null
          created_at?: string
          id?: string
          last_source_sync_at?: string
          metadata?: Json
          needs_review?: boolean
          pack_type?: string | null
          photo_slots?: Json
          playing_style_competence?: Json
          source?: string
          source_card_image_url?: string | null
          source_coach_id: string
          source_url?: string | null
          source_version?: string | null
          stat_boosters?: Json
          updated_at?: string
        }
        Update: {
          boost_ids?: Json
          catalog_ready?: boolean
          category?: string | null
          coach_name?: string
          coach_name_ja?: string | null
          coach_payload?: Json
          connection?: Json | null
          created_at?: string
          id?: string
          last_source_sync_at?: string
          metadata?: Json
          needs_review?: boolean
          pack_type?: string | null
          photo_slots?: Json
          playing_style_competence?: Json
          source?: string
          source_card_image_url?: string | null
          source_coach_id?: string
          source_url?: string | null
          source_version?: string | null
          stat_boosters?: Json
          updated_at?: string
        }
        Relationships: []
      }
      coaches: {
        Row: {
          age: number | null
          category: string | null
          coach_name: string
          connection: Json | null
          created_at: string | null
          extracted_data: Json | null
          id: string
          is_active: boolean | null
          nationality: string | null
          pack_type: string | null
          photo_slots: Json | null
          playing_style_competence: Json | null
          stat_boosters: Json | null
          team: string | null
          training_affinity_description: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age?: number | null
          category?: string | null
          coach_name: string
          connection?: Json | null
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          is_active?: boolean | null
          nationality?: string | null
          pack_type?: string | null
          photo_slots?: Json | null
          playing_style_competence?: Json | null
          stat_boosters?: Json | null
          team?: string | null
          training_affinity_description?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age?: number | null
          category?: string | null
          coach_name?: string
          connection?: Json | null
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          is_active?: boolean | null
          nationality?: string | null
          pack_type?: string | null
          photo_slots?: Json | null
          playing_style_competence?: Json | null
          stat_boosters?: Json | null
          team?: string | null
          training_affinity_description?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_error_logs: {
        Row: {
          cosa: string
          created_at: string
          error_code: string | null
          errore_testo: string | null
          funzione: string | null
          id: string
          is_refundable: boolean
          metadata: Json
          operation_type: string | null
          refund_applied: boolean
          user_id: string | null
        }
        Insert: {
          cosa: string
          created_at?: string
          error_code?: string | null
          errore_testo?: string | null
          funzione?: string | null
          id?: string
          is_refundable?: boolean
          metadata?: Json
          operation_type?: string | null
          refund_applied?: boolean
          user_id?: string | null
        }
        Update: {
          cosa?: string
          created_at?: string
          error_code?: string | null
          errore_testo?: string | null
          funzione?: string | null
          id?: string
          is_refundable?: boolean
          metadata?: Json
          operation_type?: string | null
          refund_applied?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_spin_claims: {
        Row: {
          created_at: string
          id: string
          reward_amount: number
          spin_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_amount: number
          spin_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_amount?: number
          spin_date?: string
          user_id?: string
        }
        Relationships: []
      }
      formation_layout: {
        Row: {
          created_at: string | null
          formation: string
          id: string
          slot_positions: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          formation: string
          id?: string
          slot_positions?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          formation?: string
          id?: string
          slot_positions?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      formation_variants: {
        Row: {
          created_at: string
          formation: string
          id: string
          is_active: boolean
          phase: string
          slot_positions: Json
          source_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          formation: string
          id?: string
          is_active?: boolean
          phase: string
          slot_positions?: Json
          source_version?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          formation?: string
          id?: string
          is_active?: boolean
          phase?: string
          slot_positions?: Json
          source_version?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hero_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          payload: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          payload?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          payload?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "hero_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_chat_threads: {
        Row: {
          created_at: string
          id: string
          surface: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          surface?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          surface?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string
          id: string
          month: string
          points: number
          points_breakdown: Json
          rank: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          points: number
          points_breakdown?: Json
          rank: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          points?: number
          points_breakdown?: Json
          rank?: number
          user_id?: string
        }
        Relationships: []
      }
      live_coach_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          heartbeat_count: number
          id: string
          language: string
          last_activity_at: string
          minute_blocks_billed: number
          minute_cost_hp: number
          opponent_context: Json | null
          realtime_model: string
          session_meta: Json | null
          source: string
          start_cost_hp: number
          started_at: string
          status: string
          total_hp_charged: number
          updated_at: string
          user_context: Json | null
          user_id: string
          voice: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          heartbeat_count?: number
          id?: string
          language?: string
          last_activity_at?: string
          minute_blocks_billed?: number
          minute_cost_hp?: number
          opponent_context?: Json | null
          realtime_model?: string
          session_meta?: Json | null
          source?: string
          start_cost_hp?: number
          started_at?: string
          status?: string
          total_hp_charged?: number
          updated_at?: string
          user_context?: Json | null
          user_id: string
          voice?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          heartbeat_count?: number
          id?: string
          language?: string
          last_activity_at?: string
          minute_blocks_billed?: number
          minute_cost_hp?: number
          opponent_context?: Json | null
          realtime_model?: string
          session_meta?: Json | null
          source?: string
          start_cost_hp?: number
          started_at?: string
          status?: string
          total_hp_charged?: number
          updated_at?: string
          user_context?: Json | null
          user_id?: string
          voice?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          ai_summary: string | null
          attack_areas: Json | null
          ball_recovery_zones: Json | null
          client_team_name: string | null
          conceded_goal_zones: Json | null
          created_at: string | null
          credits_used: number | null
          data_completeness: string | null
          extracted_data: Json | null
          formation_discrepancies: Json | null
          formation_played: string | null
          goals_events: Json | null
          id: string
          is_home: boolean | null
          match_date: string | null
          missing_photos: string[] | null
          opponent_formation_id: string | null
          opponent_name: string | null
          photos_uploaded: number | null
          player_ratings: Json | null
          players_in_match: Json | null
          playing_style_played: string | null
          recommended_formation_used: boolean | null
          result: string | null
          team_stats: Json | null
          team_strength: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          attack_areas?: Json | null
          ball_recovery_zones?: Json | null
          client_team_name?: string | null
          conceded_goal_zones?: Json | null
          created_at?: string | null
          credits_used?: number | null
          data_completeness?: string | null
          extracted_data?: Json | null
          formation_discrepancies?: Json | null
          formation_played?: string | null
          goals_events?: Json | null
          id?: string
          is_home?: boolean | null
          match_date?: string | null
          missing_photos?: string[] | null
          opponent_formation_id?: string | null
          opponent_name?: string | null
          photos_uploaded?: number | null
          player_ratings?: Json | null
          players_in_match?: Json | null
          playing_style_played?: string | null
          recommended_formation_used?: boolean | null
          result?: string | null
          team_stats?: Json | null
          team_strength?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          attack_areas?: Json | null
          ball_recovery_zones?: Json | null
          client_team_name?: string | null
          conceded_goal_zones?: Json | null
          created_at?: string | null
          credits_used?: number | null
          data_completeness?: string | null
          extracted_data?: Json | null
          formation_discrepancies?: Json | null
          formation_played?: string | null
          goals_events?: Json | null
          id?: string
          is_home?: boolean | null
          match_date?: string | null
          missing_photos?: string[] | null
          opponent_formation_id?: string | null
          opponent_name?: string | null
          photos_uploaded?: number | null
          player_ratings?: Json | null
          players_in_match?: Json | null
          playing_style_played?: string | null
          recommended_formation_used?: boolean | null
          result?: string | null
          team_stats?: Json | null
          team_strength?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_opponent_formation_id_fkey"
            columns: ["opponent_formation_id"]
            isOneToOne: false
            referencedRelation: "opponent_formations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opponent_formations: {
        Row: {
          created_at: string | null
          extracted_data: Json | null
          formation_image: string | null
          formation_name: string | null
          id: string
          is_pre_match: boolean | null
          match_date: string | null
          overall_strength: number | null
          players: Json | null
          playing_style: string | null
          tactical_style: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          extracted_data?: Json | null
          formation_image?: string | null
          formation_name?: string | null
          id?: string
          is_pre_match?: boolean | null
          match_date?: string | null
          overall_strength?: number | null
          players?: Json | null
          playing_style?: string | null
          tactical_style?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          extracted_data?: Json | null
          formation_image?: string | null
          formation_name?: string | null
          id?: string
          is_pre_match?: boolean | null
          match_date?: string | null
          overall_strength?: number | null
          players?: Json | null
          playing_style?: string | null
          tactical_style?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      player_catalog: {
        Row: {
          age: number | null
          ai_playstyles: string[] | null
          avatar_style: Json | null
          base_stats: Json | null
          card_category: string | null
          card_instance_key: string | null
          card_type: string
          card_variant_label: string | null
          catalog_ready: boolean
          classification_confidence: number
          completeness_score: number
          data_quality: string
          foot: string | null
          height: number | null
          id: string
          imported_at: string | null
          injury_resistance: string | null
          last_source_sync_at: string | null
          league: string | null
          max_level: number | null
          max_stats: Json | null
          metadata: Json | null
          nationality: string | null
          needs_review: boolean
          normalized_name: string | null
          overall_level_1: number | null
          overall_max_level: number | null
          pack_name: string | null
          player_identity_id: string | null
          player_identity_key: string | null
          player_name: string
          player_skills: string[] | null
          players_base_stats: Json | null
          players_payload: Json | null
          playing_style: string | null
          position: string | null
          position_compatibility: Json | null
          rating: string | null
          region: string | null
          source: string
          source_card_back_url: string | null
          source_card_front_url: string | null
          source_collection_url: string | null
          source_player_id: string
          source_section: string | null
          source_url: string | null
          source_version: string | null
          team_name: string | null
          updated_at: string | null
          variant_signature: Json | null
          weak_foot_accuracy: string | null
          weak_foot_usage: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          ai_playstyles?: string[] | null
          avatar_style?: Json | null
          base_stats?: Json | null
          card_category?: string | null
          card_instance_key?: string | null
          card_type: string
          card_variant_label?: string | null
          catalog_ready?: boolean
          classification_confidence?: number
          completeness_score?: number
          data_quality?: string
          foot?: string | null
          height?: number | null
          id?: string
          imported_at?: string | null
          injury_resistance?: string | null
          last_source_sync_at?: string | null
          league?: string | null
          max_level?: number | null
          max_stats?: Json | null
          metadata?: Json | null
          nationality?: string | null
          needs_review?: boolean
          normalized_name?: string | null
          overall_level_1?: number | null
          overall_max_level?: number | null
          pack_name?: string | null
          player_identity_id?: string | null
          player_identity_key?: string | null
          player_name: string
          player_skills?: string[] | null
          players_base_stats?: Json | null
          players_payload?: Json | null
          playing_style?: string | null
          position?: string | null
          position_compatibility?: Json | null
          rating?: string | null
          region?: string | null
          source?: string
          source_card_back_url?: string | null
          source_card_front_url?: string | null
          source_collection_url?: string | null
          source_player_id: string
          source_section?: string | null
          source_url?: string | null
          source_version?: string | null
          team_name?: string | null
          updated_at?: string | null
          variant_signature?: Json | null
          weak_foot_accuracy?: string | null
          weak_foot_usage?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          ai_playstyles?: string[] | null
          avatar_style?: Json | null
          base_stats?: Json | null
          card_category?: string | null
          card_instance_key?: string | null
          card_type?: string
          card_variant_label?: string | null
          catalog_ready?: boolean
          classification_confidence?: number
          completeness_score?: number
          data_quality?: string
          foot?: string | null
          height?: number | null
          id?: string
          imported_at?: string | null
          injury_resistance?: string | null
          last_source_sync_at?: string | null
          league?: string | null
          max_level?: number | null
          max_stats?: Json | null
          metadata?: Json | null
          nationality?: string | null
          needs_review?: boolean
          normalized_name?: string | null
          overall_level_1?: number | null
          overall_max_level?: number | null
          pack_name?: string | null
          player_identity_id?: string | null
          player_identity_key?: string | null
          player_name?: string
          player_skills?: string[] | null
          players_base_stats?: Json | null
          players_payload?: Json | null
          playing_style?: string | null
          position?: string | null
          position_compatibility?: Json | null
          rating?: string | null
          region?: string | null
          source?: string
          source_card_back_url?: string | null
          source_card_front_url?: string | null
          source_collection_url?: string | null
          source_player_id?: string
          source_section?: string | null
          source_url?: string | null
          source_version?: string | null
          team_name?: string | null
          updated_at?: string | null
          variant_signature?: Json | null
          weak_foot_accuracy?: string | null
          weak_foot_usage?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_catalog_player_identity_id_fkey"
            columns: ["player_identity_id"]
            isOneToOne: false
            referencedRelation: "player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      player_catalog_import_runs: {
        Row: {
          error_count: number
          finished_at: string | null
          id: string
          import_scope: string
          imported_count: number
          notes: string | null
          skipped_count: number
          source: string
          source_url: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          error_count?: number
          finished_at?: string | null
          id?: string
          import_scope: string
          imported_count?: number
          notes?: string | null
          skipped_count?: number
          source?: string
          source_url?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          error_count?: number
          finished_at?: string | null
          id?: string
          import_scope?: string
          imported_count?: number
          notes?: string | null
          skipped_count?: number
          source?: string
          source_url?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      player_catalog_meta_targets: {
        Row: {
          aliases: string[] | null
          created_at: string | null
          display_name: string
          id: string
          priority: number
          role_group: string | null
          source_note: string | null
          target_key: string
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string | null
          display_name: string
          id?: string
          priority?: number
          role_group?: string | null
          source_note?: string | null
          target_key: string
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          created_at?: string | null
          display_name?: string
          id?: string
          priority?: number
          role_group?: string | null
          source_note?: string | null
          target_key?: string
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      player_identities: {
        Row: {
          aliases: string[] | null
          created_at: string | null
          display_name: string
          id: string
          identity_key: string
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string | null
          display_name: string
          id?: string
          identity_key: string
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          created_at?: string | null
          display_name?: string
          id?: string
          identity_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      player_performance_aggregates: {
        Row: {
          attack_areas_avg: Json | null
          average_rating: number | null
          heatmap_aggregate: Json | null
          id: string
          last_50_matches_count: number | null
          last_updated: string | null
          player_id: string
          position_performance: Json | null
          positions_played: string[] | null
          rating_trend: Json | null
          recovery_zones_avg: Json | null
          substitution_pattern: Json | null
          total_assists: number | null
          total_goals: number | null
          total_minutes_played: number | null
          user_id: string
        }
        Insert: {
          attack_areas_avg?: Json | null
          average_rating?: number | null
          heatmap_aggregate?: Json | null
          id?: string
          last_50_matches_count?: number | null
          last_updated?: string | null
          player_id: string
          position_performance?: Json | null
          positions_played?: string[] | null
          rating_trend?: Json | null
          recovery_zones_avg?: Json | null
          substitution_pattern?: Json | null
          total_assists?: number | null
          total_goals?: number | null
          total_minutes_played?: number | null
          user_id: string
        }
        Update: {
          attack_areas_avg?: Json | null
          average_rating?: number | null
          heatmap_aggregate?: Json | null
          id?: string
          last_50_matches_count?: number | null
          last_updated?: string | null
          player_id?: string
          position_performance?: Json | null
          positions_played?: string[] | null
          rating_trend?: Json | null
          recovery_zones_avg?: Json | null
          substitution_pattern?: Json | null
          total_assists?: number | null
          total_goals?: number | null
          total_minutes_played?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_performance_aggregates_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active_booster_name: string | null
          age: number | null
          available_boosters: Json | null
          base_stats: Json | null
          card_type: string | null
          club_name: string | null
          com_skills: string[] | null
          created_at: string | null
          current_level: number | null
          development_points: Json | null
          extracted_data: Json | null
          form: string | null
          height: number | null
          id: string
          level_cap: number | null
          metadata: Json | null
          nationality: string | null
          original_positions: Json | null
          overall_rating: number | null
          photo_slots: Json | null
          player_name: string
          playing_style_id: string | null
          position: string | null
          position_ratings: Json | null
          role: string | null
          skills: string[] | null
          slot_index: number | null
          team: string | null
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          active_booster_name?: string | null
          age?: number | null
          available_boosters?: Json | null
          base_stats?: Json | null
          card_type?: string | null
          club_name?: string | null
          com_skills?: string[] | null
          created_at?: string | null
          current_level?: number | null
          development_points?: Json | null
          extracted_data?: Json | null
          form?: string | null
          height?: number | null
          id?: string
          level_cap?: number | null
          metadata?: Json | null
          nationality?: string | null
          original_positions?: Json | null
          overall_rating?: number | null
          photo_slots?: Json | null
          player_name: string
          playing_style_id?: string | null
          position?: string | null
          position_ratings?: Json | null
          role?: string | null
          skills?: string[] | null
          slot_index?: number | null
          team?: string | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          active_booster_name?: string | null
          age?: number | null
          available_boosters?: Json | null
          base_stats?: Json | null
          card_type?: string | null
          club_name?: string | null
          com_skills?: string[] | null
          created_at?: string | null
          current_level?: number | null
          development_points?: Json | null
          extracted_data?: Json | null
          form?: string | null
          height?: number | null
          id?: string
          level_cap?: number | null
          metadata?: Json | null
          nationality?: string | null
          original_positions?: Json | null
          overall_rating?: number | null
          photo_slots?: Json | null
          player_name?: string
          playing_style_id?: string | null
          position?: string | null
          position_ratings?: Json | null
          role?: string | null
          skills?: string[] | null
          slot_index?: number | null
          team?: string | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_playing_style_id_fkey"
            columns: ["playing_style_id"]
            isOneToOne: false
            referencedRelation: "playing_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      playing_styles: {
        Row: {
          category: string | null
          compatible_positions: string[]
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          compatible_positions: string[]
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          compatible_positions?: string[]
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      prematch_plans: {
        Row: {
          applied_at: string | null
          apply_result: Json | null
          change_set: Json
          countermeasures: Json
          created_at: string
          id: string
          idempotency_key: string | null
          opponent_formation_id: string | null
          status: string
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          apply_result?: Json | null
          change_set?: Json
          countermeasures?: Json
          created_at?: string
          id?: string
          idempotency_key?: string | null
          opponent_formation_id?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          apply_result?: Json | null
          change_set?: Json
          countermeasures?: Json
          created_at?: string
          id?: string
          idempotency_key?: string | null
          opponent_formation_id?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prematch_plans_opponent_formation_id_fkey"
            columns: ["opponent_formation_id"]
            isOneToOne: false
            referencedRelation: "opponent_formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prematch_plans_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "hero_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_coach_contexts: {
        Row: {
          chat_count: number
          chat_used: boolean
          coach: Json | null
          countermeasures_used: number
          created_at: string
          extraction_meta: Json
          formation: string | null
          id: string
          last_chat_answer: string | null
          last_chat_suggestions: Json
          last_countermeasures: Json
          opponent_coach: Json | null
          opponent_extraction_meta: Json
          opponent_formation: string | null
          opponent_players: Json
          players: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_count?: number
          chat_used?: boolean
          coach?: Json | null
          countermeasures_used?: number
          created_at?: string
          extraction_meta?: Json
          formation?: string | null
          id?: string
          last_chat_answer?: string | null
          last_chat_suggestions?: Json
          last_countermeasures?: Json
          opponent_coach?: Json | null
          opponent_extraction_meta?: Json
          opponent_formation?: string | null
          opponent_players?: Json
          players?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_count?: number
          chat_used?: boolean
          coach?: Json | null
          countermeasures_used?: number
          created_at?: string
          extraction_meta?: Json
          formation?: string | null
          id?: string
          last_chat_answer?: string | null
          last_chat_suggestions?: Json
          last_countermeasures?: Json
          opponent_coach?: Json | null
          opponent_extraction_meta?: Json
          opponent_formation?: string | null
          opponent_players?: Json
          players?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_tactical_patterns: {
        Row: {
          attack_areas_avg: Json | null
          avg_clean_sheets: number | null
          avg_pass_accuracy: number | null
          avg_possession: number | null
          avg_shots: number | null
          conceded_goal_zones_avg: Json | null
          formation_usage: Json | null
          goals_conceded_time_pattern: Json | null
          goals_scored_time_pattern: Json | null
          id: string
          last_50_matches_count: number | null
          last_updated: string | null
          opponent_attack_areas_avg: Json | null
          our_attack_areas_avg: Json | null
          playing_style_usage: Json | null
          recovery_zones_avg: Json | null
          recurring_issues: Json | null
          total_goals_conceded: number | null
          total_goals_scored: number | null
          user_id: string
        }
        Insert: {
          attack_areas_avg?: Json | null
          avg_clean_sheets?: number | null
          avg_pass_accuracy?: number | null
          avg_possession?: number | null
          avg_shots?: number | null
          conceded_goal_zones_avg?: Json | null
          formation_usage?: Json | null
          goals_conceded_time_pattern?: Json | null
          goals_scored_time_pattern?: Json | null
          id?: string
          last_50_matches_count?: number | null
          last_updated?: string | null
          opponent_attack_areas_avg?: Json | null
          our_attack_areas_avg?: Json | null
          playing_style_usage?: Json | null
          recovery_zones_avg?: Json | null
          recurring_issues?: Json | null
          total_goals_conceded?: number | null
          total_goals_scored?: number | null
          user_id: string
        }
        Update: {
          attack_areas_avg?: Json | null
          avg_clean_sheets?: number | null
          avg_pass_accuracy?: number | null
          avg_possession?: number | null
          avg_shots?: number | null
          conceded_goal_zones_avg?: Json | null
          formation_usage?: Json | null
          goals_conceded_time_pattern?: Json | null
          goals_scored_time_pattern?: Json | null
          id?: string
          last_50_matches_count?: number | null
          last_updated?: string | null
          opponent_attack_areas_avg?: Json | null
          our_attack_areas_avg?: Json | null
          playing_style_usage?: Json | null
          recovery_zones_avg?: Json | null
          recurring_issues?: Json | null
          total_goals_conceded?: number | null
          total_goals_scored?: number | null
          user_id?: string
        }
        Relationships: []
      }
      team_tactical_settings: {
        Row: {
          created_at: string | null
          id: string
          individual_instructions: Json | null
          team_playing_style: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          individual_instructions?: Json | null
          team_playing_style?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          individual_instructions?: Json | null
          team_playing_style?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_credit_usage: {
        Row: {
          created_at: string
          credits_included: number
          credits_used: number
          id: string
          period_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_included?: number
          credits_used?: number
          id?: string
          period_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_included?: number
          credits_used?: number
          id?: string
          period_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_diagnostic_cache: {
        Row: {
          content: string
          generated_at: string
          lang: string | null
          user_id: string
        }
        Insert: {
          content: string
          generated_at?: string
          lang?: string | null
          user_id: string
        }
        Update: {
          content?: string
          generated_at?: string
          lang?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_game_analysis: {
        Row: {
          captured_at: string
          stats: Json
          user_id: string
        }
        Insert: {
          captured_at?: string
          stats?: Json
          user_id: string
        }
        Update: {
          captured_at?: string
          stats?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_prizes: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          month: string
          position: number
          prize_type: string
          redeemed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          month: string
          position: number
          prize_type: string
          redeemed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          month?: string
          position?: number
          prize_type?: string
          redeemed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          ai_knowledge_breakdown: Json | null
          ai_knowledge_last_calculated: string | null
          ai_knowledge_level: string | null
          ai_knowledge_score: number | null
          ai_learn_goals: string | null
          ai_name: string | null
          ai_notes: string | null
          ai_weak_point: string | null
          common_problems: string[] | null
          connection_quality: string | null
          created_at: string | null
          current_division: string | null
          favorite_team: string | null
          favourite_player_name: string | null
          first_name: string | null
          hours_per_week: number | null
          how_to_remember: string | null
          id: string
          initial_division: string | null
          input_delay: string | null
          is_metalgate_user: boolean | null
          last_name: string | null
          leaderboard_consent: boolean
          metalgate_user_id: string | null
          nickname: string | null
          notification_prefs: Json
          pass_level: string | null
          platform: string | null
          profile_completion_level: string | null
          profile_completion_score: number | null
          slow_opponent_connection_issues: string | null
          smart_assist: string | null
          team_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_knowledge_breakdown?: Json | null
          ai_knowledge_last_calculated?: string | null
          ai_knowledge_level?: string | null
          ai_knowledge_score?: number | null
          ai_learn_goals?: string | null
          ai_name?: string | null
          ai_notes?: string | null
          ai_weak_point?: string | null
          common_problems?: string[] | null
          connection_quality?: string | null
          created_at?: string | null
          current_division?: string | null
          favorite_team?: string | null
          favourite_player_name?: string | null
          first_name?: string | null
          hours_per_week?: number | null
          how_to_remember?: string | null
          id?: string
          initial_division?: string | null
          input_delay?: string | null
          is_metalgate_user?: boolean | null
          last_name?: string | null
          leaderboard_consent?: boolean
          metalgate_user_id?: string | null
          nickname?: string | null
          notification_prefs?: Json
          pass_level?: string | null
          platform?: string | null
          profile_completion_level?: string | null
          profile_completion_score?: number | null
          slow_opponent_connection_issues?: string | null
          smart_assist?: string | null
          team_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_knowledge_breakdown?: Json | null
          ai_knowledge_last_calculated?: string | null
          ai_knowledge_level?: string | null
          ai_knowledge_score?: number | null
          ai_learn_goals?: string | null
          ai_name?: string | null
          ai_notes?: string | null
          ai_weak_point?: string | null
          common_problems?: string[] | null
          connection_quality?: string | null
          created_at?: string | null
          current_division?: string | null
          favorite_team?: string | null
          favourite_player_name?: string | null
          first_name?: string | null
          hours_per_week?: number | null
          how_to_remember?: string | null
          id?: string
          initial_division?: string | null
          input_delay?: string | null
          is_metalgate_user?: boolean | null
          last_name?: string | null
          leaderboard_consent?: boolean
          metalgate_user_id?: string | null
          nickname?: string | null
          notification_prefs?: Json
          pass_level?: string | null
          platform?: string | null
          profile_completion_level?: string | null
          profile_completion_score?: number | null
          slow_opponent_connection_issues?: string | null
          smart_assist?: string | null
          team_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tactical_feedback: {
        Row: {
          conversation_summary: string | null
          created_at: string | null
          formation_played: string | null
          id: string
          insights: Json
          match_id: string | null
          opponent_name: string | null
          outcome: string | null
          profile_fields_updated: Json | null
          session_type: string
          style_played: string | null
          user_id: string
        }
        Insert: {
          conversation_summary?: string | null
          created_at?: string | null
          formation_played?: string | null
          id?: string
          insights?: Json
          match_id?: string | null
          opponent_name?: string | null
          outcome?: string | null
          profile_fields_updated?: Json | null
          session_type?: string
          style_played?: string | null
          user_id: string
        }
        Update: {
          conversation_summary?: string | null
          created_at?: string | null
          formation_played?: string | null
          id?: string
          insights?: Json
          match_id?: string | null
          opponent_name?: string | null
          outcome?: string | null
          profile_fields_updated?: Json | null
          session_type?: string
          style_played?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tactical_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_value: number | null
          difficulty: string | null
          goal_description: string
          goal_type: string
          id: string
          status: string | null
          target_value: number
          updated_at: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          difficulty?: string | null
          goal_description: string
          goal_type: string
          id?: string
          status?: string | null
          target_value: number
          updated_at?: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          difficulty?: string | null
          goal_description?: string
          goal_type?: string
          id?: string
          status?: string | null
          target_value?: number
          updated_at?: string | null
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atomic_slot_assignment: {
        Args: { p_player_id: string; p_slot_index: number; p_user_id: string }
        Returns: Json
      }
      get_leaderboard_current_user: {
        Args: { month_param: string; user_id_param: string }
        Returns: {
          points: number
          points_breakdown: Json
          rank: number
        }[]
      }
      get_leaderboard_for_month: {
        Args: { month_param: string }
        Returns: {
          nickname: string
          points: number
          rank: number
        }[]
      }
      get_user_id_by_email: { Args: { user_email: string }; Returns: string }
      normalize_player_identity_key: { Args: { name: string }; Returns: string }
      player_catalog_stats_to_players_base_stats: {
        Args: { stats: Json }
        Returns: Json
      }
      refresh_coach_catalog_payloads: { Args: never; Returns: undefined }
      refresh_player_catalog_payloads: { Args: never; Returns: number }
      refresh_player_performance_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      rpc_card_advisor_cards_search_by_name: {
        Args: {
          p_limit: number
          p_position: string
          p_q: string
          p_source: string
        }
        Returns: {
          age: number | null
          ai_playstyles: string[]
          base_stats: Json
          card_type: string | null
          category: string | null
          completeness_score: number
          created_at: string
          data_quality: string
          enrichment_status: string
          error_message: string | null
          fetched_at: string
          foot: string | null
          height: number | null
          id: string
          image_url: string | null
          is_active: boolean
          last_synced_at: string
          max_stats: Json
          overall_display: number | null
          player_name: string
          player_skills: string[]
          playing_style: string | null
          position: string | null
          position_compatibility: Json
          release_id: string
          source: string
          source_payload: Json
          source_player_id: string
          source_url: string | null
          updated_at: string
          weight: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "card_advisor_cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_player_catalog_search: {
        Args: {
          p_card_type: string
          p_limit: number
          p_offset: number
          p_q: string
          p_sort: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
