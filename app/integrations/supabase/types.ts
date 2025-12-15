
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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
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
          payment_method: string | null
          payment_status: string | null
          pickup_point_id: string
          product_id: string
          selected_color: string | null
          selected_size: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage: number
          drop_id: string
          final_price: number
          id?: string
          original_price: number
          payment_method?: string | null
          payment_status?: string | null
          pickup_point_id: string
          product_id: string
          selected_color?: string | null
          selected_size?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number
          drop_id?: string
          final_price?: number
          id?: string
          original_price?: number
          payment_method?: string | null
          payment_status?: string | null
          pickup_point_id?: string
          product_id?: string
          selected_color?: string | null
          selected_size?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          variant_id?: string | null
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
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_available_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percentage: number
          id: string
          is_active: boolean | null
          name: string
          points_required: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percentage: number
          id?: string
          is_active?: boolean | null
          name: string
          points_required: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      data_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          request_type: string
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          request_type: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      drops: {
        Row: {
          activated_at: string | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          current_discount: number
          current_value: number | null
          deactivated_at: string | null
          deactivated_by: string | null
          end_time: string
          id: string
          name: string
          pickup_point_id: string
          start_time: string | null
          status: string | null
          supplier_list_id: string
          target_value: number
          underfunded_notified_at: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_discount: number
          current_value?: number | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          end_time: string
          id?: string
          name: string
          pickup_point_id: string
          start_time?: string | null
          status?: string | null
          supplier_list_id: string
          target_value: number
          underfunded_notified_at?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_discount?: number
          current_value?: number | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          end_time?: string
          id?: string
          name?: string
          pickup_point_id?: string
          start_time?: string | null
          status?: string | null
          supplier_list_id?: string
          target_value?: number
          underfunded_notified_at?: string | null
          updated_at?: string | null
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
      legal_documents: {
        Row: {
          content: string
          created_at: string
          document_type: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          document_type: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          document_type?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      notification_flows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          filter_config: Json | null
          id: string
          is_active: boolean | null
          name: string
          notification_message: string
          notification_title: string
          target_audience: string
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_message: string
          notification_title: string
          target_audience: string
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_message?: string
          notification_title?: string
          target_audience?: string
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          booking_id: string
          created_at: string | null
          customer_notified_at: string | null
          discount_percentage: number
          final_price: number
          id: string
          order_id: string
          original_price: number
          picked_up_at: string | null
          pickup_status: string | null
          product_id: string
          product_name: string
          return_reason: string | null
          returned_at: string | null
          returned_to_sender: boolean | null
          selected_color: string | null
          selected_size: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          customer_notified_at?: string | null
          discount_percentage: number
          final_price: number
          id?: string
          order_id: string
          original_price: number
          picked_up_at?: string | null
          pickup_status?: string | null
          product_id: string
          product_name: string
          return_reason?: string | null
          returned_at?: string | null
          returned_to_sender?: boolean | null
          selected_color?: string | null
          selected_size?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          customer_notified_at?: string | null
          discount_percentage?: number
          final_price?: number
          id?: string
          order_id?: string
          original_price?: number
          picked_up_at?: string | null
          pickup_status?: string | null
          product_id?: string
          product_name?: string
          return_reason?: string | null
          returned_at?: string | null
          returned_to_sender?: boolean | null
          selected_color?: string | null
          selected_size?: string | null
          user_id?: string
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
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_available_stock"
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
      pickup_points: {
        Row: {
          address: string
          city: string
          commission_rate: number | null
          consumer_info: string | null
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
          consumer_info?: string | null
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
          consumer_info?: string | null
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
      product_variants: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          product_id: string
          size: string | null
          status: string | null
          stock: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          size?: string | null
          status?: string | null
          stock?: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          size?: string | null
          status?: string | null
          stock?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_available_stock"
            referencedColumns: ["id"]
          },
        ]
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
          stock: number
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
          stock?: number
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
          stock?: number
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
          account_blocked: boolean | null
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string | null
          deletion_requested: boolean | null
          deletion_requested_at: string | null
          email: string
          full_name: string | null
          id: string
          items_returned: number | null
          loyalty_points: number | null
          orders_picked_up: number | null
          orders_returned: number | null
          phone: string | null
          pickup_point_id: string | null
          rating_stars: number | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_blocked?: boolean | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          items_returned?: number | null
          loyalty_points?: number | null
          orders_picked_up?: number | null
          orders_returned?: number | null
          phone?: string | null
          pickup_point_id?: string | null
          rating_stars?: number | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_blocked?: boolean | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          items_returned?: number | null
          loyalty_points?: number | null
          orders_picked_up?: number | null
          orders_returned?: number | null
          phone?: string | null
          pickup_point_id?: string | null
          rating_stars?: number | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
        ]
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
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          id: string
          points_earned: number | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          points_earned?: number | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          points_earned?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_date: string
          created_at: string
          id: string
          ip_address: string | null
          marketing_accepted: boolean
          privacy_accepted: boolean
          terms_accepted: boolean
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_date?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          marketing_accepted?: boolean
          privacy_accepted?: boolean
          terms_accepted?: boolean
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_date?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          marketing_accepted?: boolean
          privacy_accepted?: boolean
          terms_accepted?: boolean
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_coupons: {
        Row: {
          booking_id: string | null
          coupon_code: string
          coupon_id: string
          created_at: string | null
          discount_percentage: number
          expires_at: string | null
          id: string
          is_used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          coupon_code: string
          coupon_id: string
          created_at?: string | null
          discount_percentage: number
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string | null
          coupon_code?: string
          coupon_id?: string
          created_at?: string | null
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coupons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
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
            foreignKeyName: "user_interests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_available_stock"
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
          created_at: string
          drop_id: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drop_id?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          drop_id?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_available_stock"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      products_with_available_stock: {
        Row: {
          active_bookings_count: number | null
          additional_images: string[] | null
          available_colors: string[] | null
          available_sizes: string[] | null
          available_stock: number | null
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          name: string | null
          original_price: number | null
          sku: string | null
          status: string | null
          stock: number | null
          supplier_id: string | null
          supplier_list_id: string | null
          updated_at: string | null
        }
        Insert: {
          active_bookings_count?: never
          additional_images?: string[] | null
          available_colors?: string[] | null
          available_sizes?: string[] | null
          available_stock?: number | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          original_price?: number | null
          sku?: string | null
          status?: string | null
          stock?: number | null
          supplier_id?: string | null
          supplier_list_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active_bookings_count?: never
          additional_images?: string[] | null
          available_colors?: string[] | null
          available_sizes?: string[] | null
          available_stock?: number | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          original_price?: number | null
          sku?: string | null
          status?: string | null
          stock?: number | null
          supplier_id?: string | null
          supplier_list_id?: string | null
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
    }
    Functions: {
      admin_unblock_user: {
        Args: { p_admin_id: string; p_user_id: string }
        Returns: Json
      }
      award_loyalty_points: {
        Args: { p_amount_spent: number; p_user_id: string }
        Returns: undefined
      }
      check_and_decrement_stock: {
        Args: {
          p_discount_percentage: number
          p_drop_id: string
          p_final_price: number
          p_original_price: number
          p_payment_method_id: string
          p_pickup_point_id: string
          p_product_id: string
          p_stripe_payment_method_id: string
          p_user_id: string
        }
        Returns: Json
      }
      check_underfunded_drops: { Args: never; Returns: undefined }
      complete_drop: { Args: { p_drop_id: string }; Returns: undefined }
      expire_old_drops: { Args: never; Returns: undefined }
      get_available_products_for_drop: {
        Args: { p_supplier_list_id: string }
        Returns: {
          additional_images: string[]
          available_colors: string[]
          available_sizes: string[]
          brand: string
          category: string
          condition: string
          created_at: string
          description: string
          id: string
          image_url: string
          name: string
          original_price: number
          sku: string
          status: string
          stock: number
          supplier_id: string
          supplier_list_id: string
          updated_at: string
        }[]
      }
      get_product_available_stock: {
        Args: { product_id_param: string }
        Returns: number
      }
      get_user_by_id: {
        Args: { user_id: string }
        Returns: {
          created_at: string
          email: string
          id: string
        }[]
      }
      get_user_pickup_point_id: { Args: never; Returns: string }
      handle_item_return: {
        Args: {
          p_order_item_id: string
          p_return_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      handle_order_pickup: { Args: { p_user_id: string }; Returns: undefined }
      handle_order_return: {
        Args: { p_order_item_id: string; p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_pickup_point: { Args: never; Returns: boolean }
      notify_user_order_status: {
        Args: {
          p_order_number: string
          p_product_name: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_drop_lifecycle: { Args: never; Returns: undefined }
      recalculate_all_drops: {
        Args: never
        Returns: {
          drop_id: string
          drop_name: string
          new_discount: number
          new_value: number
          old_discount: number
          old_value: number
        }[]
      }
      recalculate_drop_discount: {
        Args: { p_drop_id: string }
        Returns: undefined
      }
      release_underfunded_drop_funds:
        | { Args: never; Returns: undefined }
        | {
            Args: { drop_id_param: string }
            Returns: {
              authorized_amount: number
              booking_id: string
              product_id: string
              user_email: string
              user_id: string
            }[]
          }
      update_coupon_admin: {
        Args: {
          p_coupon_id: string
          p_discount_percentage: number
          p_points_required: number
        }
        Returns: Json
      }
      update_user_rating: { Args: { p_user_id: string }; Returns: undefined }
      validate_phone_format: {
        Args: { phone_number: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
