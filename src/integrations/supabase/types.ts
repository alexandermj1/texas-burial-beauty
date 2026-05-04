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
      agent_sales: {
        Row: {
          agent_name: string
          cemetery: string | null
          created_at: string
          id: string
          is_mortuary: boolean
          listing_source: string | null
          notes: string | null
          profit: number | null
          sale_amount: number | null
          sale_date: string
          sale_number: string | null
          updated_at: string
        }
        Insert: {
          agent_name: string
          cemetery?: string | null
          created_at?: string
          id?: string
          is_mortuary?: boolean
          listing_source?: string | null
          notes?: string | null
          profit?: number | null
          sale_amount?: number | null
          sale_date: string
          sale_number?: string | null
          updated_at?: string
        }
        Update: {
          agent_name?: string
          cemetery?: string | null
          created_at?: string
          id?: string
          is_mortuary?: boolean
          listing_source?: string | null
          notes?: string | null
          profit?: number | null
          sale_amount?: number | null
          sale_date?: string
          sale_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      buyer_recommendations: {
        Row: {
          asking_price: number | null
          buyer_response: string | null
          cemetery: string | null
          created_at: string
          id: string
          listing_id: string
          notes: string | null
          plot_type: string | null
          responded_at: string | null
          sent_at: string
          sent_by_name: string | null
          submission_id: string
        }
        Insert: {
          asking_price?: number | null
          buyer_response?: string | null
          cemetery?: string | null
          created_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          plot_type?: string | null
          responded_at?: string | null
          sent_at?: string
          sent_by_name?: string | null
          submission_id: string
        }
        Update: {
          asking_price?: number | null
          buyer_response?: string | null
          cemetery?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          plot_type?: string | null
          responded_at?: string | null
          sent_at?: string
          sent_by_name?: string | null
          submission_id?: string
        }
        Relationships: []
      }
      ca_inventory: {
        Row: {
          area: string | null
          cemetery: string
          cemetery_key: string | null
          control_number: string | null
          county: string | null
          created_at: string
          discount_pct_off_retail: number | null
          id: string
          lawn_key: string | null
          location_details: string | null
          net_pct_to_owner: number | null
          net_to_owner: number | null
          notes: string | null
          owner_name: string | null
          poa_date: string | null
          price_unit: string | null
          property_type: string | null
          property_type_code: number | null
          property_type_norm: string | null
          resale_pct_of_retail: number | null
          resale_price: number | null
          retail_price: number | null
          sku: string | null
          status: string
          transfer_fee: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          cemetery: string
          cemetery_key?: string | null
          control_number?: string | null
          county?: string | null
          created_at?: string
          discount_pct_off_retail?: number | null
          id?: string
          lawn_key?: string | null
          location_details?: string | null
          net_pct_to_owner?: number | null
          net_to_owner?: number | null
          notes?: string | null
          owner_name?: string | null
          poa_date?: string | null
          price_unit?: string | null
          property_type?: string | null
          property_type_code?: number | null
          property_type_norm?: string | null
          resale_pct_of_retail?: number | null
          resale_price?: number | null
          retail_price?: number | null
          sku?: string | null
          status?: string
          transfer_fee?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          cemetery?: string
          cemetery_key?: string | null
          control_number?: string | null
          county?: string | null
          created_at?: string
          discount_pct_off_retail?: number | null
          id?: string
          lawn_key?: string | null
          location_details?: string | null
          net_pct_to_owner?: number | null
          net_to_owner?: number | null
          notes?: string | null
          owner_name?: string | null
          poa_date?: string | null
          price_unit?: string | null
          property_type?: string | null
          property_type_code?: number | null
          property_type_norm?: string | null
          resale_pct_of_retail?: number | null
          resale_price?: number | null
          retail_price?: number | null
          sku?: string | null
          status?: string
          transfer_fee?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ca_sold_history: {
        Row: {
          area: string | null
          cemetery: string
          cemetery_key: string | null
          control_number: string | null
          created_at: string
          discount_pct_off_retail: number | null
          id: string
          lawn_key: string | null
          location_details: string | null
          net_pct_to_owner: number | null
          net_to_owner: number | null
          notes: string | null
          owner_name: string | null
          poa_date: string | null
          property_type: string | null
          property_type_code: number | null
          property_type_norm: string | null
          resale_pct_of_retail: number | null
          resale_price: number | null
          retail_price: number | null
          sku: string | null
          sold_marker: string | null
          transfer_fee: string | null
        }
        Insert: {
          area?: string | null
          cemetery: string
          cemetery_key?: string | null
          control_number?: string | null
          created_at?: string
          discount_pct_off_retail?: number | null
          id?: string
          lawn_key?: string | null
          location_details?: string | null
          net_pct_to_owner?: number | null
          net_to_owner?: number | null
          notes?: string | null
          owner_name?: string | null
          poa_date?: string | null
          property_type?: string | null
          property_type_code?: number | null
          property_type_norm?: string | null
          resale_pct_of_retail?: number | null
          resale_price?: number | null
          retail_price?: number | null
          sku?: string | null
          sold_marker?: string | null
          transfer_fee?: string | null
        }
        Update: {
          area?: string | null
          cemetery?: string
          cemetery_key?: string | null
          control_number?: string | null
          created_at?: string
          discount_pct_off_retail?: number | null
          id?: string
          lawn_key?: string | null
          location_details?: string | null
          net_pct_to_owner?: number | null
          net_to_owner?: number | null
          notes?: string | null
          owner_name?: string | null
          poa_date?: string | null
          property_type?: string | null
          property_type_code?: number | null
          property_type_norm?: string | null
          resale_pct_of_retail?: number | null
          resale_price?: number | null
          retail_price?: number | null
          sku?: string | null
          sold_marker?: string | null
          transfer_fee?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          acceptance_channel: string | null
          admin_notes: string | null
          authorization_confirmed: boolean | null
          authorization_notes: string | null
          bayer_entry_id: string | null
          budget: string | null
          cemetery: string | null
          cemetery_city: string | null
          cemetery_retail: number | null
          cemetery_verified_ownership: boolean | null
          closed_at: string | null
          closed_outcome: string | null
          created_at: string
          customer_kind: string | null
          customer_profile_id: string | null
          death_cert_on_file: boolean | null
          deed_on_file: boolean | null
          deed_owner_names: string | null
          deed_owners_status: string | null
          details: string | null
          documents_requested_at: string | null
          docusign_envelope_url: string | null
          docusign_sent_at: string | null
          docusign_signed_at: string | null
          docusign_status: string
          email: string | null
          gdrive_url: string | null
          gov_id_on_file: boolean | null
          handled: boolean
          handled_at: string | null
          handled_by_name: string | null
          handled_by_user_id: string | null
          id: string
          inquiry_channel: string | null
          la_countersigned_at: string | null
          la_issued_at: string | null
          la_signature_expires_at: string | null
          la_signed_at: string | null
          lawn: string | null
          listing_live_at: string | null
          listing_number: string | null
          listing_option: string | null
          listing_url: string | null
          message: string | null
          morgued_at: string | null
          multi_owner_perm_required: boolean | null
          multi_owner_perm_signed_at: string | null
          name: string | null
          ownership_type: string | null
          payment_link_sent_at: string | null
          payment_received_at: string | null
          phone: string | null
          pipeline_stage_override: string | null
          plot_count: number | null
          property_type: string | null
          purchase_info: string | null
          quote_amount: number | null
          quote_approved_by: string | null
          quote_expires_at: string | null
          quote_message: string | null
          quote_net_amount: number | null
          quote_responded_at: string | null
          quote_response: string | null
          quote_sent_at: string | null
          quote_template: string | null
          receipt_sent_at: string | null
          region: string | null
          relationship_to_owner: string | null
          section: string | null
          source: string
          source_email_id: string | null
          space_numbers: string | null
          spaces: string | null
          state: string | null
          timeline: string | null
          transfer_fee_amount: number | null
          updated_at: string
        }
        Insert: {
          acceptance_channel?: string | null
          admin_notes?: string | null
          authorization_confirmed?: boolean | null
          authorization_notes?: string | null
          bayer_entry_id?: string | null
          budget?: string | null
          cemetery?: string | null
          cemetery_city?: string | null
          cemetery_retail?: number | null
          cemetery_verified_ownership?: boolean | null
          closed_at?: string | null
          closed_outcome?: string | null
          created_at?: string
          customer_kind?: string | null
          customer_profile_id?: string | null
          death_cert_on_file?: boolean | null
          deed_on_file?: boolean | null
          deed_owner_names?: string | null
          deed_owners_status?: string | null
          details?: string | null
          documents_requested_at?: string | null
          docusign_envelope_url?: string | null
          docusign_sent_at?: string | null
          docusign_signed_at?: string | null
          docusign_status?: string
          email?: string | null
          gdrive_url?: string | null
          gov_id_on_file?: boolean | null
          handled?: boolean
          handled_at?: string | null
          handled_by_name?: string | null
          handled_by_user_id?: string | null
          id?: string
          inquiry_channel?: string | null
          la_countersigned_at?: string | null
          la_issued_at?: string | null
          la_signature_expires_at?: string | null
          la_signed_at?: string | null
          lawn?: string | null
          listing_live_at?: string | null
          listing_number?: string | null
          listing_option?: string | null
          listing_url?: string | null
          message?: string | null
          morgued_at?: string | null
          multi_owner_perm_required?: boolean | null
          multi_owner_perm_signed_at?: string | null
          name?: string | null
          ownership_type?: string | null
          payment_link_sent_at?: string | null
          payment_received_at?: string | null
          phone?: string | null
          pipeline_stage_override?: string | null
          plot_count?: number | null
          property_type?: string | null
          purchase_info?: string | null
          quote_amount?: number | null
          quote_approved_by?: string | null
          quote_expires_at?: string | null
          quote_message?: string | null
          quote_net_amount?: number | null
          quote_responded_at?: string | null
          quote_response?: string | null
          quote_sent_at?: string | null
          quote_template?: string | null
          receipt_sent_at?: string | null
          region?: string | null
          relationship_to_owner?: string | null
          section?: string | null
          source?: string
          source_email_id?: string | null
          space_numbers?: string | null
          spaces?: string | null
          state?: string | null
          timeline?: string | null
          transfer_fee_amount?: number | null
          updated_at?: string
        }
        Update: {
          acceptance_channel?: string | null
          admin_notes?: string | null
          authorization_confirmed?: boolean | null
          authorization_notes?: string | null
          bayer_entry_id?: string | null
          budget?: string | null
          cemetery?: string | null
          cemetery_city?: string | null
          cemetery_retail?: number | null
          cemetery_verified_ownership?: boolean | null
          closed_at?: string | null
          closed_outcome?: string | null
          created_at?: string
          customer_kind?: string | null
          customer_profile_id?: string | null
          death_cert_on_file?: boolean | null
          deed_on_file?: boolean | null
          deed_owner_names?: string | null
          deed_owners_status?: string | null
          details?: string | null
          documents_requested_at?: string | null
          docusign_envelope_url?: string | null
          docusign_sent_at?: string | null
          docusign_signed_at?: string | null
          docusign_status?: string
          email?: string | null
          gdrive_url?: string | null
          gov_id_on_file?: boolean | null
          handled?: boolean
          handled_at?: string | null
          handled_by_name?: string | null
          handled_by_user_id?: string | null
          id?: string
          inquiry_channel?: string | null
          la_countersigned_at?: string | null
          la_issued_at?: string | null
          la_signature_expires_at?: string | null
          la_signed_at?: string | null
          lawn?: string | null
          listing_live_at?: string | null
          listing_number?: string | null
          listing_option?: string | null
          listing_url?: string | null
          message?: string | null
          morgued_at?: string | null
          multi_owner_perm_required?: boolean | null
          multi_owner_perm_signed_at?: string | null
          name?: string | null
          ownership_type?: string | null
          payment_link_sent_at?: string | null
          payment_received_at?: string | null
          phone?: string | null
          pipeline_stage_override?: string | null
          plot_count?: number | null
          property_type?: string | null
          purchase_info?: string | null
          quote_amount?: number | null
          quote_approved_by?: string | null
          quote_expires_at?: string | null
          quote_message?: string | null
          quote_net_amount?: number | null
          quote_responded_at?: string | null
          quote_response?: string | null
          quote_sent_at?: string | null
          quote_template?: string | null
          receipt_sent_at?: string | null
          region?: string | null
          relationship_to_owner?: string | null
          section?: string | null
          source?: string
          source_email_id?: string | null
          space_numbers?: string | null
          spaces?: string | null
          state?: string | null
          timeline?: string | null
          transfer_fee_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submissions_source_email_id_fkey"
            columns: ["source_email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activity_log: {
        Row: {
          action_summary: string
          action_type: string
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          customer_profile_id: string | null
          details: Json | null
          id: string
          submission_id: string | null
        }
        Insert: {
          action_summary: string
          action_type: string
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          customer_profile_id?: string | null
          details?: Json | null
          id?: string
          submission_id?: string | null
        }
        Update: {
          action_summary?: string
          action_type?: string
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          customer_profile_id?: string | null
          details?: Json | null
          id?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_activity_log_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          author_name: string | null
          author_user_id: string | null
          body: string
          created_at: string
          customer_profile_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          author_user_id?: string | null
          body: string
          created_at?: string
          customer_profile_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          author_user_id?: string | null
          body?: string
          created_at?: string
          customer_profile_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          alt_emails: string[] | null
          alt_phones: string[] | null
          created_at: string
          customer_kind: string | null
          id: string
          last_interaction_at: string | null
          lifetime_value: number | null
          pinned_notes: string | null
          primary_email: string | null
          primary_name: string | null
          primary_phone: string | null
          state_focus: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alt_emails?: string[] | null
          alt_phones?: string[] | null
          created_at?: string
          customer_kind?: string | null
          id?: string
          last_interaction_at?: string | null
          lifetime_value?: number | null
          pinned_notes?: string | null
          primary_email?: string | null
          primary_name?: string | null
          primary_phone?: string | null
          state_focus?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alt_emails?: string[] | null
          alt_phones?: string[] | null
          created_at?: string
          customer_kind?: string | null
          id?: string
          last_interaction_at?: string | null
          lifetime_value?: number | null
          pinned_notes?: string | null
          primary_email?: string | null
          primary_name?: string | null
          primary_phone?: string | null
          state_focus?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          ai_analyzed_at: string | null
          ai_draft_reply: string | null
          ai_intent: string | null
          ai_summary: string | null
          body_html: string | null
          body_text: string | null
          created_at: string
          customer_profile_id: string | null
          fetched_at: string
          from_email: string
          from_name: string | null
          gmail_message_id: string
          gmail_thread_id: string
          id: string
          is_read: boolean
          match_confidence: string | null
          matched_submission_id: string | null
          received_at: string
          snippet: string | null
          subject: string | null
          to_email: string | null
          updated_at: string
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_draft_reply?: string | null
          ai_intent?: string | null
          ai_summary?: string | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          customer_profile_id?: string | null
          fetched_at?: string
          from_email: string
          from_name?: string | null
          gmail_message_id: string
          gmail_thread_id: string
          id?: string
          is_read?: boolean
          match_confidence?: string | null
          matched_submission_id?: string | null
          received_at: string
          snippet?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_draft_reply?: string | null
          ai_intent?: string | null
          ai_summary?: string | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          customer_profile_id?: string | null
          fetched_at?: string
          from_email?: string
          from_name?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string
          id?: string
          is_read?: boolean
          match_confidence?: string | null
          matched_submission_id?: string | null
          received_at?: string
          snippet?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_matched_submission_id_fkey"
            columns: ["matched_submission_id"]
            isOneToOne: false
            referencedRelation: "contact_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_requests: {
        Row: {
          admin_response: string | null
          agent_id: string
          agent_name: string | null
          buyer_context: string | null
          cemetery: string
          created_at: string
          id: string
          notes: string | null
          priority: string
          property_type: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          section: string | null
          spaces: number | null
          status: string
          target_price: number | null
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          agent_id: string
          agent_name?: string | null
          buyer_context?: string | null
          cemetery: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string
          property_type?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          section?: string | null
          spaces?: number | null
          status?: string
          target_price?: number | null
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          agent_id?: string
          agent_name?: string | null
          buyer_context?: string | null
          cemetery?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string
          property_type?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          section?: string | null
          spaces?: number | null
          status?: string
          target_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          asking_price: number | null
          cemetery: string
          city: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          photos: string[] | null
          plot_type: string
          profit: number | null
          section: string
          spaces: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asking_price?: number | null
          cemetery: string
          city: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[] | null
          plot_type: string
          profit?: number | null
          section: string
          spaces?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asking_price?: number | null
          cemetery?: string
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[] | null
          plot_type?: string
          profit?: number | null
          section?: string
          spaces?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plot_reservations: {
        Row: {
          agent_id: string
          commission_amount: number | null
          commission_status: string | null
          created_at: string
          expires_at: string
          id: string
          listing_id: string
          notes: string | null
          reserved_at: string
          showing_date: string
          showing_time: string
          sold_price: number | null
          status: string
        }
        Insert: {
          agent_id: string
          commission_amount?: number | null
          commission_status?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          reserved_at?: string
          showing_date: string
          showing_time: string
          sold_price?: number | null
          status?: string
        }
        Update: {
          agent_id?: string
          commission_amount?: number | null
          commission_status?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          reserved_at?: string
          showing_date?: string
          showing_time?: string
          sold_price?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "plot_reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plot_reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_internal"
            referencedColumns: ["id"]
          },
        ]
      }
      poa_records: {
        Row: {
          created_at: string
          delivery_method: string | null
          id: string
          issued_at: string | null
          mailed_at: string | null
          notarized_at: string | null
          notes: string | null
          owner_name: string
          poa_type: string
          relation: string | null
          returned_at: string | null
          status: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_method?: string | null
          id?: string
          issued_at?: string | null
          mailed_at?: string | null
          notarized_at?: string | null
          notes?: string | null
          owner_name: string
          poa_type?: string
          relation?: string | null
          returned_at?: string | null
          status?: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_method?: string | null
          id?: string
          issued_at?: string | null
          mailed_at?: string | null
          notarized_at?: string | null
          notes?: string | null
          owner_name?: string
          poa_type?: string
          relation?: string | null
          returned_at?: string | null
          status?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_estimates: {
        Row: {
          ai_cost_estimate_usd: number | null
          ai_explanation: string | null
          ai_model_used: string | null
          cemetery: string
          cemetery_key: string | null
          closest_comp: Json | null
          comp_count: number | null
          confidence_label: string | null
          confidence_score: number | null
          created_at: string
          customer_profile_id: string | null
          estimated_high: number | null
          estimated_low: number | null
          estimated_mid: number | null
          generated_by_name: string | null
          generated_by_user_id: string | null
          id: string
          lawn: string | null
          lawn_key: string | null
          outcome: string | null
          outcome_amount: number | null
          outcome_at: string | null
          property_type: string | null
          property_type_norm: string | null
          request_details: string | null
          spaces: number | null
          state: string | null
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          ai_cost_estimate_usd?: number | null
          ai_explanation?: string | null
          ai_model_used?: string | null
          cemetery: string
          cemetery_key?: string | null
          closest_comp?: Json | null
          comp_count?: number | null
          confidence_label?: string | null
          confidence_score?: number | null
          created_at?: string
          customer_profile_id?: string | null
          estimated_high?: number | null
          estimated_low?: number | null
          estimated_mid?: number | null
          generated_by_name?: string | null
          generated_by_user_id?: string | null
          id?: string
          lawn?: string | null
          lawn_key?: string | null
          outcome?: string | null
          outcome_amount?: number | null
          outcome_at?: string | null
          property_type?: string | null
          property_type_norm?: string | null
          request_details?: string | null
          spaces?: number | null
          state?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_cost_estimate_usd?: number | null
          ai_explanation?: string | null
          ai_model_used?: string | null
          cemetery?: string
          cemetery_key?: string | null
          closest_comp?: Json | null
          comp_count?: number | null
          confidence_label?: string | null
          confidence_score?: number | null
          created_at?: string
          customer_profile_id?: string | null
          estimated_high?: number | null
          estimated_low?: number | null
          estimated_mid?: number | null
          generated_by_name?: string | null
          generated_by_user_id?: string | null
          id?: string
          lawn?: string | null
          lawn_key?: string | null
          outcome?: string | null
          outcome_amount?: number | null
          outcome_at?: string | null
          property_type?: string | null
          property_type_norm?: string | null
          request_details?: string | null
          spaces?: number | null
          state?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_estimates_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_revisions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by_name: string | null
          id: string
          new_amount: number
          prior_amount: number | null
          reason: string | null
          submission_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by_name?: string | null
          id?: string
          new_amount: number
          prior_amount?: number | null
          reason?: string | null
          submission_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by_name?: string | null
          id?: string
          new_amount?: number
          prior_amount?: number | null
          reason?: string | null
          submission_id?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reminder_type: string
          sent_at: string
          sent_via: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reminder_type: string
          sent_at?: string
          sent_via?: string
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reminder_type?: string
          sent_at?: string
          sent_via?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contact_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          agent_id: string
          commission_amount: number | null
          commission_status: string
          cost_price: number | null
          created_at: string
          id: string
          listing_id: string
          profit: number | null
          reservation_id: string | null
          sold_at: string
          sold_price: number
        }
        Insert: {
          agent_id: string
          commission_amount?: number | null
          commission_status?: string
          cost_price?: number | null
          created_at?: string
          id?: string
          listing_id: string
          profit?: number | null
          reservation_id?: string | null
          sold_at?: string
          sold_price: number
        }
        Update: {
          agent_id?: string
          commission_amount?: number | null
          commission_status?: string
          cost_price?: number | null
          created_at?: string
          id?: string
          listing_id?: string
          profit?: number | null
          reservation_id?: string | null
          sold_at?: string
          sold_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_internal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "plot_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_documents: {
        Row: {
          created_at: string
          document_type: string
          file_url: string | null
          id: string
          label: string
          notes: string | null
          received_at: string | null
          requested_at: string | null
          status: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_url?: string | null
          id?: string
          label: string
          notes?: string | null
          received_at?: string | null
          requested_at?: string | null
          status?: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_url?: string | null
          id?: string
          label?: string
          notes?: string | null
          received_at?: string | null
          requested_at?: string | null
          status?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_documents_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contact_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      listings_internal: {
        Row: {
          asking_price: number | null
          cemetery: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string | null
          photos: string[] | null
          plot_type: string | null
          profit: number | null
          section: string | null
          spaces: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          asking_price?: number | null
          cemetery?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          photos?: string[] | null
          plot_type?: string | null
          profit?: number | null
          section?: string | null
          spaces?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          asking_price?: number | null
          cemetery?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          photos?: string[] | null
          plot_type?: string | null
          profit?: number | null
          section?: string | null
          spaces?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      canonical_cemetery: { Args: { name: string }; Returns: string }
      canonical_property_type: { Args: { pt: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "agent"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "agent"],
    },
  },
} as const
