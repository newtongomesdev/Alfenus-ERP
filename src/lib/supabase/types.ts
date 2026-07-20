export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      law_firms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          document: string | null;
          email: string | null;
          phone: string | null;
          logo_path: string | null;
          address: Json;
          plan: string;
          status: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          logo_path?: string | null;
          address?: Json;
          plan?: string;
          status?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          logo_path?: string | null;
          address?: Json;
          plan?: string;
          status?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      law_firm_members: {
        Row: {
          id: string;
          user_id: string;
          law_firm_id: string;
          name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          position: string | null;
          role: string;
          status: string;
          last_access_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          law_firm_id: string;
          name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          position?: string | null;
          role?: string;
          status?: string;
          last_access_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          law_firm_id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          position?: string | null;
          role?: string;
          status?: string;
          last_access_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "law_firm_members_law_firm_id_fkey";
            columns: ["law_firm_id"];
            isOneToOne: false;
            referencedRelation: "law_firms";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          law_firm_id: string;
          name: string;
          person_type: string;
          document: string | null;
          birth_date: string | null;
          profession: string | null;
          marital_status: string | null;
          whatsapp: string | null;
          phone: string | null;
          email: string | null;
          address: Json;
          source: string | null;
          interest_area: string | null;
          responsible_member_id: string | null;
          status: string;
          notes: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          name: string;
          person_type: string;
          document?: string | null;
          birth_date?: string | null;
          profession?: string | null;
          marital_status?: string | null;
          whatsapp?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: Json;
          source?: string | null;
          interest_area?: string | null;
          responsible_member_id?: string | null;
          status?: string;
          notes?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          name?: string;
          person_type?: string;
          document?: string | null;
          birth_date?: string | null;
          profession?: string | null;
          marital_status?: string | null;
          whatsapp?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: Json;
          source?: string | null;
          interest_area?: string | null;
          responsible_member_id?: string | null;
          status?: string;
          notes?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          law_firm_id: string;
          name: string;
          phone: string | null;
          whatsapp: string | null;
          email: string | null;
          source: string | null;
          interest: string | null;
          funnel_stage: string;
          responsible_member_id: string | null;
          probability: number;
          estimated_value_cents: number;
          notes: string | null;
          next_contact_at: string | null;
          status: string;
          converted_client_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          name: string;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          source?: string | null;
          interest?: string | null;
          funnel_stage?: string;
          responsible_member_id?: string | null;
          probability?: number;
          estimated_value_cents?: number;
          notes?: string | null;
          next_contact_at?: string | null;
          status?: string;
          converted_client_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          name?: string;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          source?: string | null;
          interest?: string | null;
          funnel_stage?: string;
          responsible_member_id?: string | null;
          probability?: number;
          estimated_value_cents?: number;
          notes?: string | null;
          next_contact_at?: string | null;
          status?: string;
          converted_client_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      legal_cases: {
        Row: {
          id: string;
          law_firm_id: string;
          client_id: string | null;
          title: string;
          case_number: string | null;
          case_kind: string;
          action_type: string;
          court: string | null;
          court_division: string | null;
          district: string | null;
          state: string | null;
          started_at: string | null;
          opposing_party: string | null;
          opposing_lawyer: string | null;
          main_responsible_id: string | null;
          strategic_notes: string | null;
          tags: string[];
          status: string;
          priority: string;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          client_id?: string | null;
          title: string;
          case_number?: string | null;
          case_kind?: string;
          action_type?: string;
          court?: string | null;
          court_division?: string | null;
          district?: string | null;
          state?: string | null;
          started_at?: string | null;
          opposing_party?: string | null;
          opposing_lawyer?: string | null;
          main_responsible_id?: string | null;
          strategic_notes?: string | null;
          tags?: string[];
          status?: string;
          priority?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          client_id?: string | null;
          title?: string;
          case_number?: string | null;
          case_kind?: string;
          action_type?: string;
          court?: string | null;
          court_division?: string | null;
          district?: string | null;
          state?: string | null;
          started_at?: string | null;
          opposing_party?: string | null;
          opposing_lawyer?: string | null;
          main_responsible_id?: string | null;
          strategic_notes?: string | null;
          tags?: string[];
          status?: string;
          priority?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          law_firm_id: string;
          client_id: string;
          legal_case_id: string | null;
          service_description: string;
          total_amount_cents: number;
          upfront_amount_cents: number;
          balance_cents: number;
          has_installments: boolean;
          installments_count: number;
          first_due_date: string | null;
          frequency: string | null;
          default_due_day: number | null;
          payment_method: string | null;
          fine_cents: number;
          interest_basis_points: number;
          discount_cents: number;
          success_fee: string | null;
          responsible_member_id: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          client_id: string;
          legal_case_id?: string | null;
          service_description: string;
          total_amount_cents?: number;
          upfront_amount_cents?: number;
          balance_cents?: number;
          has_installments?: boolean;
          installments_count?: number;
          first_due_date?: string | null;
          frequency?: string | null;
          default_due_day?: number | null;
          payment_method?: string | null;
          fine_cents?: number;
          interest_basis_points?: number;
          discount_cents?: number;
          success_fee?: string | null;
          responsible_member_id?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          client_id?: string;
          legal_case_id?: string | null;
          service_description?: string;
          total_amount_cents?: number;
          upfront_amount_cents?: number;
          balance_cents?: number;
          has_installments?: boolean;
          installments_count?: number;
          first_due_date?: string | null;
          frequency?: string | null;
          default_due_day?: number | null;
          payment_method?: string | null;
          fine_cents?: number;
          interest_basis_points?: number;
          discount_cents?: number;
          success_fee?: string | null;
          responsible_member_id?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      installments: {
        Row: {
          id: string;
          law_firm_id: string;
          contract_id: string;
          client_id: string;
          number: number;
          original_amount_cents: number;
          discount_cents: number;
          fine_cents: number;
          interest_cents: number;
          final_amount_cents: number;
          due_date: string;
          paid_at: string | null;
          paid_amount_cents: number;
          payment_method: string | null;
          status: string;
          receipt_path: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          contract_id: string;
          client_id: string;
          number: number;
          original_amount_cents: number;
          discount_cents?: number;
          fine_cents?: number;
          interest_cents?: number;
          final_amount_cents: number;
          due_date: string;
          paid_at?: string | null;
          paid_amount_cents?: number;
          payment_method?: string | null;
          status?: string;
          receipt_path?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          contract_id?: string;
          client_id?: string;
          number?: number;
          original_amount_cents?: number;
          discount_cents?: number;
          fine_cents?: number;
          interest_cents?: number;
          final_amount_cents?: number;
          due_date?: string;
          paid_at?: string | null;
          paid_amount_cents?: number;
          payment_method?: string | null;
          status?: string;
          receipt_path?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          law_firm_id: string;
          client_id: string;
          contract_id: string;
          installment_id: string | null;
          amount_cents: number;
          payment_method: string;
          paid_at: string;
          discount_cents: number;
          fine_cents: number;
          interest_cents: number;
          receipt_path: string | null;
          notes: string | null;
          registered_by: string | null;
          reversed_at: string | null;
          reversal_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          client_id: string;
          contract_id: string;
          installment_id?: string | null;
          amount_cents: number;
          payment_method: string;
          paid_at: string;
          discount_cents?: number;
          fine_cents?: number;
          interest_cents?: number;
          receipt_path?: string | null;
          notes?: string | null;
          registered_by?: string | null;
          reversed_at?: string | null;
          reversal_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          client_id?: string;
          contract_id?: string;
          installment_id?: string | null;
          amount_cents?: number;
          payment_method?: string;
          paid_at?: string;
          discount_cents?: number;
          fine_cents?: number;
          interest_cents?: number;
          receipt_path?: string | null;
          notes?: string | null;
          registered_by?: string | null;
          reversed_at?: string | null;
          reversal_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          law_firm_id: string;
          description: string;
          category: string | null;
          client_id: string | null;
          legal_case_id: string | null;
          supplier: string | null;
          amount_cents: number;
          due_date: string | null;
          paid_at: string | null;
          status: string;
          receipt_path: string | null;
          responsible_member_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          description: string;
          category?: string | null;
          client_id?: string | null;
          legal_case_id?: string | null;
          supplier?: string | null;
          amount_cents: number;
          due_date?: string | null;
          paid_at?: string | null;
          status?: string;
          receipt_path?: string | null;
          responsible_member_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          description?: string;
          category?: string | null;
          client_id?: string | null;
          legal_case_id?: string | null;
          supplier?: string | null;
          amount_cents?: number;
          due_date?: string | null;
          paid_at?: string | null;
          status?: string;
          receipt_path?: string | null;
          responsible_member_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      deadlines: {
        Row: {
          id: string;
          law_firm_id: string;
          title: string;
          type: string;
          client_id: string | null;
          legal_case_id: string | null;
          responsible_member_id: string | null;
          participant_ids: string[];
          due_date: string;
          due_time: string | null;
          priority: string;
          status: string;
          description: string | null;
          checklist: Json;
          reminders: Json;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          title: string;
          type: string;
          client_id?: string | null;
          legal_case_id?: string | null;
          responsible_member_id?: string | null;
          participant_ids?: string[];
          due_date: string;
          due_time?: string | null;
          priority?: string;
          status?: string;
          description?: string | null;
          checklist?: Json;
          reminders?: Json;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          title?: string;
          type?: string;
          client_id?: string | null;
          legal_case_id?: string | null;
          responsible_member_id?: string | null;
          participant_ids?: string[];
          due_date?: string;
          due_time?: string | null;
          priority?: string;
          status?: string;
          description?: string | null;
          checklist?: Json;
          reminders?: Json;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          law_firm_id: string;
          title: string;
          description: string | null;
          client_id: string | null;
          legal_case_id: string | null;
          responsible_member_id: string | null;
          participant_ids: string[];
          priority: string;
          status: string;
          due_at: string | null;
          checklist: Json;
          comments: Json;
          attachments: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          title: string;
          description?: string | null;
          client_id?: string | null;
          legal_case_id?: string | null;
          responsible_member_id?: string | null;
          participant_ids?: string[];
          priority?: string;
          status?: string;
          due_at?: string | null;
          checklist?: Json;
          comments?: Json;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          title?: string;
          description?: string | null;
          client_id?: string | null;
          legal_case_id?: string | null;
          responsible_member_id?: string | null;
          participant_ids?: string[];
          priority?: string;
          status?: string;
          due_at?: string | null;
          checklist?: Json;
          comments?: Json;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          law_firm_id: string;
          title: string;
          type: string;
          starts_at: string;
          ends_at: string | null;
          client_id: string | null;
          legal_case_id: string | null;
          responsible_member_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          title: string;
          type: string;
          starts_at: string;
          ends_at?: string | null;
          client_id?: string | null;
          legal_case_id?: string | null;
          responsible_member_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          title?: string;
          type?: string;
          starts_at?: string;
          ends_at?: string | null;
          client_id?: string | null;
          legal_case_id?: string | null;
          responsible_member_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          law_firm_id: string;
          name: string;
          mime_type: string | null;
          size_bytes: number;
          storage_path: string;
          entity_type: string;
          entity_id: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          name: string;
          mime_type?: string | null;
          size_bytes: number;
          storage_path: string;
          entity_type: string;
          entity_id?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          name?: string;
          mime_type?: string | null;
          size_bytes?: number;
          storage_path?: string;
          entity_type?: string;
          entity_id?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          law_firm_id: string;
          member_id: string | null;
          type: string;
          title: string;
          body: string | null;
          read_at: string | null;
          archived_at: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          member_id?: string | null;
          type: string;
          title: string;
          body?: string | null;
          read_at?: string | null;
          archived_at?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          member_id?: string | null;
          type?: string;
          title?: string;
          body?: string | null;
          read_at?: string | null;
          archived_at?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          law_firm_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      legal_case_parties: {
        Row: {
          id: string;
          law_firm_id: string;
          legal_case_id: string;
          name: string;
          party_role: string;
          document: string | null;
          contact: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          legal_case_id: string;
          name: string;
          party_role: string;
          document?: string | null;
          contact?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          legal_case_id?: string;
          name?: string;
          party_role?: string;
          document?: string | null;
          contact?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      legal_case_collaborators: {
        Row: {
          id: string;
          law_firm_id: string;
          legal_case_id: string;
          member_id: string;
          collaborator_role: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          legal_case_id: string;
          member_id: string;
          collaborator_role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          legal_case_id?: string;
          member_id?: string;
          collaborator_role?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      legal_case_movements: {
        Row: {
          id: string;
          law_firm_id: string;
          legal_case_id: string;
          title: string;
          description: string | null;
          occurred_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          legal_case_id: string;
          title: string;
          description?: string | null;
          occurred_at: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          legal_case_id?: string;
          title?: string;
          description?: string | null;
          occurred_at?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      team_invitations: {
        Row: {
          id: string;
          law_firm_id: string;
          email: string;
          role: string;
          token: string;
          status: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          email: string;
          role: string;
          token: string;
          status?: string;
          invited_by?: string | null;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          email?: string;
          role?: string;
          token?: string;
          status?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      client_portal_invites: {
        Row: {
          id: string;
          law_firm_id: string;
          client_id: string;
          token: string;
          email: string | null;
          status: string;
          expires_at: string | null;
          last_access_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          client_id: string;
          token: string;
          email?: string | null;
          status?: string;
          expires_at?: string | null;
          last_access_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          client_id?: string;
          token?: string;
          email?: string | null;
          status?: string;
          expires_at?: string | null;
          last_access_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_portal_invites_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_portal_invites_law_firm_id_fkey";
            columns: ["law_firm_id"];
            isOneToOne: false;
            referencedRelation: "law_firms";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_templates: {
        Row: {
          id: string;
          law_firm_id: string;
          name: string;
          description: string | null;
          practice_area: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          name: string;
          description?: string | null;
          practice_area?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          name?: string;
          description?: string | null;
          practice_area?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflow_template_items: {
        Row: {
          id: string;
          law_firm_id: string;
          template_id: string;
          item_type: string;
          title: string;
          description: string | null;
          offset_days: number;
          priority: string;
          responsible_role: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          template_id: string;
          item_type: string;
          title: string;
          description?: string | null;
          offset_days?: number;
          priority?: string;
          responsible_role?: string | null;
          sort_order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          template_id?: string;
          item_type?: string;
          title?: string;
          description?: string | null;
          offset_days?: number;
          priority?: string;
          responsible_role?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_template_items_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "workflow_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      time_entries: {
        Row: {
          id: string;
          law_firm_id: string;
          member_id: string;
          client_id: string | null;
          legal_case_id: string | null;
          contract_id: string | null;
          task_id: string | null;
          description: string;
          started_at: string;
          ended_at: string | null;
          duration_minutes: number;
          hourly_rate_cents: number;
          billable: boolean;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          member_id: string;
          client_id?: string | null;
          legal_case_id?: string | null;
          contract_id?: string | null;
          task_id?: string | null;
          description: string;
          started_at: string;
          ended_at?: string | null;
          duration_minutes: number;
          hourly_rate_cents?: number;
          billable?: boolean;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          member_id?: string;
          client_id?: string | null;
          legal_case_id?: string | null;
          contract_id?: string | null;
          task_id?: string | null;
          description?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_minutes?: number;
          hourly_rate_cents?: number;
          billable?: boolean;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "law_firm_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_legal_case_id_fkey";
            columns: ["legal_case_id"];
            isOneToOne: false;
            referencedRelation: "legal_cases";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          law_firm_id: string;
          author_id: string | null;
          author_name: string | null;
          entity_type: string;
          entity_id: string;
          parent_id: string | null;
          content: string;
          is_private: boolean;
          is_deleted: boolean;
          edited_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          author_id?: string | null;
          author_name?: string | null;
          entity_type: string;
          entity_id: string;
          parent_id?: string | null;
          content: string;
          is_private?: boolean;
          is_deleted?: boolean;
          edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          author_id?: string | null;
          author_name?: string | null;
          entity_type?: string;
          entity_id?: string;
          parent_id?: string | null;
          content?: string;
          is_private?: boolean;
          is_deleted?: boolean;
          edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comment_mentions: {
        Row: {
          id: string;
          comment_id: string;
          member_id: string;
          law_firm_id: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          member_id: string;
          law_firm_id: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          comment_id?: string;
          member_id?: string;
          law_firm_id?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          law_firm_id: string;
          actor_id: string | null;
          actor_name: string | null;
          event_type: string;
          entity_type: string;
          entity_id: string;
          entity_title: string | null;
          description: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          actor_id?: string | null;
          actor_name?: string | null;
          event_type: string;
          entity_type: string;
          entity_id: string;
          entity_title?: string | null;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          event_type?: string;
          entity_type?: string;
          entity_id?: string;
          entity_title?: string | null;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          law_firm_id: string;
          member_id: string;
          notification_type: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          law_firm_id: string;
          member_id: string;
          notification_type: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          law_firm_id?: string;
          member_id?: string;
          notification_type?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_law_firm_with_owner: {
        Args: {
          firm_name: string;
          firm_slug: string;
          firm_document?: string | null;
          firm_email?: string | null;
          firm_phone?: string | null;
        };
        Returns: string;
      };
      convert_lead_to_client: {
        Args: {
          target_lead_id: string;
        };
        Returns: string;
      };
      register_payment: {
        Args: {
          p_law_firm_id: string;
          p_installment_id: string;
          p_amount_cents: number;
          p_payment_method: string;
          p_paid_at: string;
          p_discount_cents?: number;
          p_fine_cents?: number;
          p_interest_cents?: number;
          p_notes?: string | null;
          p_registered_by?: string | null;
        };
        Returns: Json;
      };
      reverse_payment: {
        Args: {
          p_law_firm_id: string;
          p_payment_id: string;
          p_reason?: string | null;
        };
        Returns: Json;
      };
      global_search: {
        Args: {
          p_query: string;
          p_law_firm_id: string;
        };
        Returns: {
          id: string;
          title: string;
          subtitle: string;
          entity_type: string;
          result_rank: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
