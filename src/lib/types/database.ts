export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      themes: {
        Row: {
          id: string;
          slug: string;
          name: string;
          prompt_template: string;
          is_active: boolean;
          access_tier: "free" | "pro";
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          prompt_template: string;
          is_active?: boolean;
          access_tier?: "free" | "pro";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          prompt_template?: string;
          is_active?: boolean;
          access_tier?: "free" | "pro";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          user_id: string;
          theme_id: string | null;
          status: "draft" | "queued" | "generating" | "succeeded" | "failed";
          input: Json;
          prompt_final: string;
          dog_photo_path: string;
          result_image_path: string | null;
          image_width: number | null;
          image_height: number | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme_id?: string | null;
          status: "draft" | "queued" | "generating" | "succeeded" | "failed";
          input?: Json;
          prompt_final?: string;
          dog_photo_path?: string;
          result_image_path?: string | null;
          image_width?: number | null;
          image_height?: number | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme_id?: string | null;
          status?: "draft" | "queued" | "generating" | "succeeded" | "failed";
          input?: Json;
          prompt_final?: string;
          dog_photo_path?: string;
          result_image_path?: string | null;
          image_width?: number | null;
          image_height?: number | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

