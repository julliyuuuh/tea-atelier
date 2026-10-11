-- Run after the admin audit migration to include phone changes in customer audit entries.
BEGIN;
CREATE OR REPLACE FUNCTION public.audit_safe_snapshot(table_label TEXT, data JSONB)
RETURNS JSONB LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE fields TEXT[];
BEGIN
  IF data IS NULL THEN RETURN NULL; END IF;
  fields := CASE table_label
    WHEN 'users' THEN ARRAY['user_id','first_name','last_name','email','phone_number','role','is_suspended','is_verified','totp_enabled']
    WHEN 'products' THEN ARRAY['product_id','product_name','product_desc','product_image','category','sub_category','type','price','status','stock_quantity','is_archived']
    WHEN 'orders' THEN ARRAY['order_id','order_status','payment_status','payment_method','total_amount','shipping_cost','paymongo_payment_id','payment_fulfillment_issue']
    WHEN 'order_returns' THEN ARRAY['return_id','order_id','kind','status','refund_amount_cents']
    WHEN 'return_refund_attempts' THEN ARRAY['attempt_id','return_id','amount_cents','channel','state','provider_refund_id','payment_id','reference','is_test']
    WHEN 'contact_messages' THEN ARRAY['message_id','status']
    ELSE ARRAY[]::TEXT[] END;
  IF table_label = ANY(ARRAY['about_hero','about_pillars','about_story','about_team','collections_intro','collections_items','faq_items','homepage_categories','homepage_hero','homepage_promo','homepage_reviews','homepage_why_choose_us','privacy_intro','privacy_sections']) THEN
    RETURN data - 'created_at' - 'updated_at';
  END IF;
  RETURN COALESCE((SELECT jsonb_object_agg(key,value) FROM jsonb_each(data) WHERE key=ANY(fields)),'{}'::JSONB);
END;
$$;
COMMIT;
