
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string | null
          discount_percentage: number
          drop_id: string
          final_price: number
          id: string
          original_price: number
          payment_intent_id: string | null
          payment_status: string | null
          pickup_point_id: string
          product_id: string
          selected_color: string | null
          selected_size: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          payment_method_id: string | null
          stripe_payment_method_id: string | null
          authorized_amount: number | null
          payment_method: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage: number
          drop_id: string
          final_price: number
          id?: string
          original_price: number
          payment_intent_id?: string | null
          payment_status?: string | null
          pickup_point_id: string
          product_id: string
          selected_color?: string | null
          selected_size?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          payment_method_id?: string | null
          stripe_payment_method_id?: string | null
          authorized_amount?: number | null
          payment_method?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number
          drop_id?: string
          final_price?: number
          id?: string
          original_price?: number
          payment_intent_id?: string | null
          payment_status?: string | null
          pickup_point_id?: string
          product_id?: string
          selected_color?: string | null
          selected_size?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          payment_method_id?: string | null
          stripe_payment_method_id?: string | null
          authorized_amount?: number | null
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          id: string
          name: string
          description: string | null
          discount_percentage: number
          points_required: number
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          discount_percentage: number
          points_required: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          discount_percentage?: number
          points_required?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drops: {
        Row: {
          created_at: string | null
          current_discount: number
          current_value: number | null
          end_time: string
          id: string
          name: string
          pickup_point_id: string
          start_time: string | null
          status: string | null
          supplier_list_id: string
          target_value: number
          updated_at: string | null
          completed_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_discount: number
          current_value?: number | null
          end_time: string
          id?: string
          name: string
          pickup_point_id: string
          start_time?: string | null
          status?: string | null
          supplier_list_id: string
          target_value: number
          updated_at?: string | null
          completed_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_discount?: number
          current_value?: number | null
          end_time?: string
          id?: string
          name?: string
          pickup_point_id?: string
          start_time?: string | null
          status?: string | null
          supplier_list_id?: string
          target_value?: number
          updated_at?: string | null
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drops_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drops_supplier_list_id_fkey"
            columns: ["supplier_list_id"]
            isOneToOne: false
            referencedRelation: "supplier_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          related_id: string | null
          related_type: string | null
          read: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          related_id?: string | null
          related_type?: string | null
          read?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          related_id?: string | null
          related_type?: string | null
          read?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          booking_id: string
          created_at: string | null
          discount_percentage: number
          final_price: number
          id: string
          order_id: string
          original_price: number
          picked_up_at: string | null
          pickup_status: string | null
          product_id: string
          product_name: string
          selected_color: string | null
          selected_size: string | null
          user_id: string
          customer_notified_at: string | null
          returned_to_sender: boolean | null
          returned_at: string | null
          return_reason: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          discount_percentage: number
          final_price: number
          id?: string
          order_id: string
          original_price: number
          picked_up_at?: string | null
          pickup_status?: string | null
          product_id: string
          product_name: string
          selected_color?: string | null
          selected_size?: string | null
          user_id: string
          customer_notified_at?: string | null
          returned_to_sender?: boolean | null
          returned_at?: string | null
          return_reason?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          discount_percentage?: number
          final_price?: number
          id?: string
          order_id?: string
          original_price?: number
          picked_up_at?: string | null
          pickup_status?: string | null
          product_id?: string
          product_name?: string
          selected_color?: string | null
          selected_size?: string | null
          user_id?: string
          customer_notified_at?: string | null
          returned_to_sender?: boolean | null
          returned_at?: string | null
          return_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          arrived_at: string | null
          commission_amount: number
          completed_at: string | null
          created_at: string | null
          drop_id: string
          id: string
          order_number: string
          pickup_point_id: string
          shipped_at: string | null
          status: string | null
          supplier_id: string
          total_value: number
          updated_at: string | null
        }
        Insert: {
          arrived_at?: string | null
          commission_amount: number
          completed_at?: string | null
          created_at?: string | null
          drop_id: string
          id?: string
          order_number: string
          pickup_point_id: string
          shipped_at?: string | null
          status?: string | null
          supplier_id: string
          total_value: number
          updated_at?: string | null
        }
        Update: {
          arrived_at?: string | null
          commission_amount?: number
          completed_at?: string | null
          created_at?: string | null
          drop_id?: string
          id?: string
          order_number?: string
          pickup_point_id?: string
          shipped_at?: string | null
          status?: string | null
          supplier_id?: string
          total_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          status: string | null
          stripe_payment_method_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          status?: string | null
          stripe_payment_method_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          status?: string | null
          stripe_payment_method_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pickup_points: {
        Row: {
          address: string
          city: string
          commission_rate: number | null
          created_at: string | null
          email: string
          id: string
          manager_name: string
          name: string
          phone: string
          postal_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          commission_rate?: number | null
          created_at?: string | null
          email: string
          id?: string
          manager_name: string
          name: string
          phone: string
          postal_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          commission_rate?: number | null
          created_at?: string | null
          email?: string
          id?: string
          manager_name?: string
          name?: string
          phone?: string
          postal_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          additional_images: string[] | null
          available_colors: string[] | null
          available_sizes: string[] | null
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          name: string
          original_price: number
          sku: string | null
          status: string | null
          stock: number | null
          supplier_id: string
          supplier_list_id: string
          updated_at: string | null
        }
        Insert: {
          additional_images?: string[] | null
          available_colors?: string[] | null
          available_sizes?: string[] | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          name: string
          original_price: number
          sku?: string | null
          status?: string | null
          stock?: number | null
          supplier_id: string
          supplier_list_id: string
          updated_at?: string | null
        }
        Update: {
          additional_images?: string[] | null
          available_colors?: string[] | null
          available_sizes?: string[] | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          name?: string
          original_price?: number
          sku?: string | null
          status?: string | null
          stock?: number | null
          supplier_id?: string
          supplier_list_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_list_id_fkey"
            columns: ["supplier_list_id"]
            isOneToOne: false
            referencedRelation: "supplier_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          pickup_point_id: string | null
          role: string
          updated_at: string | null
          user_id: string
          rating_stars: number | null
          loyalty_points: number | null
          orders_picked_up: number | null
          orders_returned: number | null
          account_blocked: boolean | null
          blocked_at: string | null
          blocked_reason: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          pickup_point_id?: string | null
          role: string
          updated_at?: string | null
          user_id: string
          rating_stars?: number | null
          loyalty_points?: number | null
          orders_picked_up?: number | null
          orders_returned?: number | null
          account_blocked?: boolean | null
          blocked_at?: string | null
          blocked_reason?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          pickup_point_id?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
          rating_stars?: number | null
          loyalty_points?: number | null
          orders_picked_up?: number | null
          orders_returned?: number | null
          account_blocked?: boolean | null
          blocked_at?: string | null
          blocked_reason?: string | null
        }
        Relationships: []
      }
      supplier_lists: {
        Row: {
          created_at: string | null
          id: string
          max_discount: number
          max_reservation_value: number
          min_discount: number
          min_reservation_value: number
          name: string
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_discount: number
          max_reservation_value: number
          min_discount: number
          min_reservation_value: number
          name: string
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_discount?: number
          max_reservation_value?: number
          min_discount?: number
          min_reservation_value?: number
          name?: string
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          activity_data: Json | null
          points_earned: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          activity_data?: Json | null
          points_earned?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          activity_data?: Json | null
          points_earned?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_coupons: {
        Row: {
          id: string
          user_id: string
          coupon_id: string
          coupon_code: string
          discount_percentage: number
          is_used: boolean | null
          used_at: string | null
          booking_id: string | null
          created_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          coupon_id: string
          coupon_code: string
          discount_percentage: number
          is_used?: boolean | null
          used_at?: string | null
          booking_id?: string | null
          created_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          coupon_id?: string
          coupon_code?: string
          discount_percentage?: number
          is_used?: boolean | null
          used_at?: string | null
          booking_id?: string | null
          created_at?: string | null
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coupons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string | null
          id: string
          pickup_point_id: string
          product_id: string
          supplier_list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pickup_point_id: string
          product_id: string
          supplier_list_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pickup_point_id?: string
          product_id?: string
          supplier_list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interests_supplier_list_id_fkey"
            columns: ["supplier_list_id"]
            isOneToOne: false
            referencedRelation: "supplier_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          id: string
          user_id: string
          product_id: string
          drop_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          drop_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          drop_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_user_rating: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      award_loyalty_points: {
        Args: { p_user_id: string; p_amount_spent: number }
        Returns: undefined
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
