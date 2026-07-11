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
      agent_locations: {
        Row: {
          address: string | null
          city: string | null
          color: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          color?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          color?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      cemetery_files: {
        Row: {
          cemetery_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          label: string | null
          mime_type: string | null
          uploaded_by_name: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          cemetery_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          label?: string | null
          mime_type?: string | null
          uploaded_by_name?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          cemetery_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          label?: string | null
          mime_type?: string | null
          uploaded_by_name?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cemetery_files_cemetery_id_fkey"
            columns: ["cemetery_id"]
            isOneToOne: false
            referencedRelation: "texas_cemeteries"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          acceptance_channel: string | null
          accepted_quote_amount: number | null
          admin_notes: string | null
          authorization_confirmed: boolean | null
          authorization_notes: string | null
          bayer_entry_id: string | null
          budget: string | null
          cemetery: string | null
          cemetery_city: string | null
          cemetery_merge_history: Json
          cemetery_original: string | null
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
          deleted_at: string | null
          deleted_by: string | null
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
          list_price: number | null
          listing_live_at: string | null
          listing_number: string | null
          listing_option: string | null
          listing_paid_at: string | null
          listing_tier: string | null
          listing_url: string | null
          manual_followup: boolean
          message: string | null
          morgued_at: string | null
          multi_owner_perm_required: boolean | null
          multi_owner_perm_signed_at: string | null
          name: string | null
          needs_quote: boolean
          ownership_type: string | null
          payment_link_sent_at: string | null
          payment_received_at: string | null
          phone: string | null
          pipeline_region: string | null
          pipeline_stage_override: string | null
          plot_count: number | null
          prepaid_endowment_info: string | null
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
          reply_dismissed_at: string | null
          reserved_at: string | null
          reserved_by_email: string | null
          reserved_by_name: string | null
          reserved_by_submission_id: string | null
          reserved_until: string | null
          section: string | null
          seller_attachments: Json
          seller_payout_paid_at: string | null
          seller_payout_status: string | null
          sold_at: string | null
          sold_price: number | null
          source: string
          source_email_id: string | null
          space_numbers: string | null
          spaces: string | null
          state: string | null
          texas_details_received_at: string | null
          texas_intake_sent_at: string | null
          texas_pipeline_stage: string | null
          timeline: string | null
          transfer_fee_amount: number | null
          updated_at: string
        }
        Insert: {
          acceptance_channel?: string | null
          accepted_quote_amount?: number | null
          admin_notes?: string | null
          authorization_confirmed?: boolean | null
          authorization_notes?: string | null
          bayer_entry_id?: string | null
          budget?: string | null
          cemetery?: string | null
          cemetery_city?: string | null
          cemetery_merge_history?: Json
          cemetery_original?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          list_price?: number | null
          listing_live_at?: string | null
          listing_number?: string | null
          listing_option?: string | null
          listing_paid_at?: string | null
          listing_tier?: string | null
          listing_url?: string | null
          manual_followup?: boolean
          message?: string | null
          morgued_at?: string | null
          multi_owner_perm_required?: boolean | null
          multi_owner_perm_signed_at?: string | null
          name?: string | null
          needs_quote?: boolean
          ownership_type?: string | null
          payment_link_sent_at?: string | null
          payment_received_at?: string | null
          phone?: string | null
          pipeline_region?: string | null
          pipeline_stage_override?: string | null
          plot_count?: number | null
          prepaid_endowment_info?: string | null
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
          reply_dismissed_at?: string | null
          reserved_at?: string | null
          reserved_by_email?: string | null
          reserved_by_name?: string | null
          reserved_by_submission_id?: string | null
          reserved_until?: string | null
          section?: string | null
          seller_attachments?: Json
          seller_payout_paid_at?: string | null
          seller_payout_status?: string | null
          sold_at?: string | null
          sold_price?: number | null
          source?: string
          source_email_id?: string | null
          space_numbers?: string | null
          spaces?: string | null
          state?: string | null
          texas_details_received_at?: string | null
          texas_intake_sent_at?: string | null
          texas_pipeline_stage?: string | null
          timeline?: string | null
          transfer_fee_amount?: number | null
          updated_at?: string
        }
        Update: {
          acceptance_channel?: string | null
          accepted_quote_amount?: number | null
          admin_notes?: string | null
          authorization_confirmed?: boolean | null
          authorization_notes?: string | null
          bayer_entry_id?: string | null
          budget?: string | null
          cemetery?: string | null
          cemetery_city?: string | null
          cemetery_merge_history?: Json
          cemetery_original?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          list_price?: number | null
          listing_live_at?: string | null
          listing_number?: string | null
          listing_option?: string | null
          listing_paid_at?: string | null
          listing_tier?: string | null
          listing_url?: string | null
          manual_followup?: boolean
          message?: string | null
          morgued_at?: string | null
          multi_owner_perm_required?: boolean | null
          multi_owner_perm_signed_at?: string | null
          name?: string | null
          needs_quote?: boolean
          ownership_type?: string | null
          payment_link_sent_at?: string | null
          payment_received_at?: string | null
          phone?: string | null
          pipeline_region?: string | null
          pipeline_stage_override?: string | null
          plot_count?: number | null
          prepaid_endowment_info?: string | null
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
          reply_dismissed_at?: string | null
          reserved_at?: string | null
          reserved_by_email?: string | null
          reserved_by_name?: string | null
          reserved_by_submission_id?: string | null
          reserved_until?: string | null
          section?: string | null
          seller_attachments?: Json
          seller_payout_paid_at?: string | null
          seller_payout_status?: string | null
          sold_at?: string | null
          sold_price?: number | null
          source?: string
          source_email_id?: string | null
          space_numbers?: string | null
          spaces?: string | null
          state?: string | null
          texas_details_received_at?: string | null
          texas_intake_sent_at?: string | null
          texas_pipeline_stage?: string | null
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
      customer_files: {
        Row: {
          created_at: string
          customer_profile_id: string
          document_type: string | null
          extracted_at: string | null
          extracted_data: Json | null
          extracted_summary: string | null
          extraction_error: string | null
          extraction_status: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          uploaded_by_name: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_profile_id: string
          document_type?: string | null
          extracted_at?: string | null
          extracted_data?: Json | null
          extracted_summary?: string | null
          extraction_error?: string | null
          extraction_status?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          uploaded_by_name?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_profile_id?: string
          document_type?: string | null
          extracted_at?: string | null
          extracted_data?: Json | null
          extracted_summary?: string | null
          extraction_error?: string | null
          extraction_status?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          uploaded_by_name?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          author_name: string | null
          author_user_id: string | null
          body: string
          created_at: string
          customer_profile_id: string | null
          id: string
          parent_note_id: string | null
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          author_user_id?: string | null
          body: string
          created_at?: string
          customer_profile_id?: string | null
          id?: string
          parent_note_id?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          author_user_id?: string | null
          body?: string
          created_at?: string
          customer_profile_id?: string | null
          id?: string
          parent_note_id?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_parent_note_id_fkey"
            columns: ["parent_note_id"]
            isOneToOne: false
            referencedRelation: "customer_notes"
            referencedColumns: ["id"]
          },
        ]
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
      marketing_campaigns: {
        Row: {
          body_overrides: Json
          brand: Database["public"]["Enums"]["marketing_brand"]
          created_at: string
          created_by: string | null
          from_email: string
          from_name: string
          id: string
          name: string
          preheader: string | null
          reply_to: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["marketing_campaign_status"]
          subject: string
          template_key: string
          total_bounced: number
          total_clicked: number
          total_failed: number
          total_opened: number
          total_recipients: number
          total_sent: number
          total_unsubscribed: number
          updated_at: string
        }
        Insert: {
          body_overrides?: Json
          brand: Database["public"]["Enums"]["marketing_brand"]
          created_at?: string
          created_by?: string | null
          from_email: string
          from_name: string
          id?: string
          name: string
          preheader?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["marketing_campaign_status"]
          subject: string
          template_key: string
          total_bounced?: number
          total_clicked?: number
          total_failed?: number
          total_opened?: number
          total_recipients?: number
          total_sent?: number
          total_unsubscribed?: number
          updated_at?: string
        }
        Update: {
          body_overrides?: Json
          brand?: Database["public"]["Enums"]["marketing_brand"]
          created_at?: string
          created_by?: string | null
          from_email?: string
          from_name?: string
          id?: string
          name?: string
          preheader?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["marketing_campaign_status"]
          subject?: string
          template_key?: string
          total_bounced?: number
          total_clicked?: number
          total_failed?: number
          total_opened?: number
          total_recipients?: number
          total_sent?: number
          total_unsubscribed?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketing_contacts: {
        Row: {
          bounced_at: string | null
          brand: Database["public"]["Enums"]["marketing_brand"]
          city: string | null
          company: string | null
          complained_at: string | null
          created_at: string
          csv_batch_id: string | null
          email: string
          extra: Json
          first_name: string | null
          id: string
          last_name: string | null
          last_sent_at: string | null
          phone: string | null
          source: string
          state: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          bounced_at?: string | null
          brand: Database["public"]["Enums"]["marketing_brand"]
          city?: string | null
          company?: string | null
          complained_at?: string | null
          created_at?: string
          csv_batch_id?: string | null
          email: string
          extra?: Json
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_sent_at?: string | null
          phone?: string | null
          source?: string
          state?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          bounced_at?: string | null
          brand?: Database["public"]["Enums"]["marketing_brand"]
          city?: string | null
          company?: string | null
          complained_at?: string | null
          created_at?: string
          csv_batch_id?: string | null
          email?: string
          extra?: Json
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_sent_at?: string | null
          phone?: string | null
          source?: string
          state?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_sends: {
        Row: {
          bounced_at: string | null
          brand: Database["public"]["Enums"]["marketing_brand"]
          campaign_id: string
          clicked_at: string | null
          complained_at: string | null
          contact_id: string | null
          created_at: string
          email: string
          error: string | null
          id: string
          opened_at: string | null
          resend_email_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["marketing_send_status"]
          unsubscribed_at: string | null
        }
        Insert: {
          bounced_at?: string | null
          brand: Database["public"]["Enums"]["marketing_brand"]
          campaign_id: string
          clicked_at?: string | null
          complained_at?: string | null
          contact_id?: string | null
          created_at?: string
          email: string
          error?: string | null
          id?: string
          opened_at?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["marketing_send_status"]
          unsubscribed_at?: string | null
        }
        Update: {
          bounced_at?: string | null
          brand?: Database["public"]["Enums"]["marketing_brand"]
          campaign_id?: string
          clicked_at?: string | null
          complained_at?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string
          error?: string | null
          id?: string
          opened_at?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["marketing_send_status"]
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "marketing_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_unsubscribe_tokens: {
        Row: {
          brand: Database["public"]["Enums"]["marketing_brand"]
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          email: string
          token: string
          used_at: string | null
        }
        Insert: {
          brand: Database["public"]["Enums"]["marketing_brand"]
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          email: string
          token: string
          used_at?: string | null
        }
        Update: {
          brand?: Database["public"]["Enums"]["marketing_brand"]
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_unsubscribe_tokens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_unsubscribe_tokens_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "marketing_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          checkout_url: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          currency: string
          description: string | null
          dispute_status: string | null
          environment: string
          id: string
          kind: string
          metadata: Json | null
          paid_at: string | null
          recipient_email: string | null
          recipient_name: string | null
          refund_amount_cents: number | null
          refunded_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          checkout_url?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          currency?: string
          description?: string | null
          dispute_status?: string | null
          environment?: string
          id?: string
          kind: string
          metadata?: Json | null
          paid_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          checkout_url?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          currency?: string
          description?: string | null
          dispute_status?: string | null
          environment?: string
          id?: string
          kind?: string
          metadata?: Json | null
          paid_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contact_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      submission_views: {
        Row: {
          id: string
          submission_id: string
          user_id: string
          user_name: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          user_id: string
          user_name?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          user_id?: string
          user_name?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      texas_cemeteries: {
        Row: {
          address: string | null
          auto_created: boolean
          canonical_name: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          endowment_notes: string | null
          geocoded_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          process_info: string | null
          sections: Json
          transfer_fee: number | null
          typical_prices: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          auto_created?: boolean
          canonical_name?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          endowment_notes?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          process_info?: string | null
          sections?: Json
          transfer_fee?: number | null
          typical_prices?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          auto_created?: boolean
          canonical_name?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          endowment_notes?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          process_info?: string | null
          sections?: Json
          transfer_fee?: number | null
          typical_prices?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link_url: string | null
          read_at: string | null
          source_id: string | null
          source_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link_url?: string | null
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link_url?: string | null
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
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
      get_listings_with_internal: {
        Args: never
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      marketing_brand: "texas" | "bayer"
      marketing_campaign_status: "draft" | "sending" | "sent" | "failed"
      marketing_send_status:
        | "pending"
        | "sent"
        | "failed"
        | "bounced"
        | "complained"
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
      marketing_brand: ["texas", "bayer"],
      marketing_campaign_status: ["draft", "sending", "sent", "failed"],
      marketing_send_status: [
        "pending",
        "sent",
        "failed",
        "bounced",
        "complained",
      ],
    },
  },
} as const
