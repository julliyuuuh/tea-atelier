-- Tea Atelier: actual non-CMS table schema exported from Railway.
-- Source: user-supplied railway-schema.sql; PostgreSQL/pg_dump 18.6.
-- Prepared 2026-10-29. Source SHA-256: b44f7c2ab47614f40f7d8d9fbf995f521f7e418a4b93b608cb7a47484967c043
-- 22 tables; CMS content tables and their objects are excluded.
-- Exact exported table/column definitions, owned sequences, defaults,
-- constraints and indexes. No application functions/triggers or permissions.
-- For ER diagrams and EMPTY scratch databases only; NOT a live migration.
-- Cart revisions require a trigger/sequence omitted from this table-only file.
-- See docs/database-schema.md for scope and observed migration differences.

BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Core accounts, catalog and checkout tables.
CREATE TABLE public.users (
    user_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    role character varying(50) DEFAULT 'customer'::character varying,
    email character varying(50),
    password_hash character varying(255),
    date_created date DEFAULT now(),
    phone_number character varying(11),
    google_id character varying(255),
    is_verified boolean DEFAULT false NOT NULL,
    verification_token character varying(255),
    verification_token_expires timestamp with time zone,
    totp_secret character varying(255),
    totp_enabled boolean DEFAULT false NOT NULL,
    reset_token_hash text,
    reset_token_expires timestamp without time zone,
    avatar_url text,
    is_suspended boolean DEFAULT false NOT NULL,
    business_approved boolean DEFAULT false NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['customer'::character varying, 'admin'::character varying, 'super_admin'::character varying])::text[])))
);

CREATE TABLE public.products (
    product_id integer NOT NULL,
    product_name character varying(150) NOT NULL,
    product_desc text NOT NULL,
    product_image character varying(255) DEFAULT NULL::character varying,
    category character varying(150) NOT NULL,
    price numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'NO STOCK'::character varying,
    stock_quantity integer DEFAULT 0 NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    sub_category text,
    type text,
    gallery_images jsonb DEFAULT '[]'::jsonb NOT NULL
);

CREATE TABLE public.user_address (
    address_id integer NOT NULL,
    user_id integer,
    address_line1 character varying(255) NOT NULL,
    address_line2 character varying(255),
    address_line3 character varying(255),
    default_address boolean DEFAULT false,
    default_billing boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    barangay text,
    is_saved boolean DEFAULT false NOT NULL,
    business_name character varying(200),
    billing_contact character varying(100),
    tax_id character varying(32),
    address_label character varying(40)
);

CREATE TABLE public.cart (
    cart_id integer NOT NULL,
    user_id integer,
    product_id integer,
    quantity integer DEFAULT 1,
    checkout_revision bigint NOT NULL
);

CREATE TABLE public.orders (
    order_id integer NOT NULL,
    user_id integer,
    address_id integer,
    shipping_cost numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) DEFAULT 0,
    order_status character varying(20) DEFAULT 'PLACED'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    payment_method character varying(20) DEFAULT 'cod'::character varying NOT NULL,
    contact_phone character varying(20),
    recipient_name character varying(100),
    payment_status text DEFAULT 'pending'::text,
    paymongo_source_id text,
    checkout_request_key text,
    checkout_request_hash text,
    paymongo_payment_id text,
    payment_fulfillment_issue text,
    shipping_method text DEFAULT 'standard'::text NOT NULL,
    shipping_label text DEFAULT 'Standard delivery'::text NOT NULL,
    card_session_attempt uuid,
    paymongo_checkout_session_id text,
    paymongo_payment_intent_id text
);

CREATE TABLE public.order_items (
    order_items_id integer NOT NULL,
    order_id integer,
    product_id integer,
    quantity integer DEFAULT 1,
    price numeric(10,2) NOT NULL,
    cart_checkout_revision bigint
);

CREATE TABLE public.wishlist (
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.contact_messages (
    message_id integer NOT NULL,
    user_id integer NOT NULL,
    subject character varying(255),
    message text NOT NULL,
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    admin_reply text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    replied_at timestamp without time zone,
    customer_viewed_at timestamp without time zone
);

-- Supporting operational tables.
CREATE TABLE public.notifications (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    order_id integer,
    event_key text NOT NULL,
    status text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    email_state text DEFAULT 'not_required'::text NOT NULL,
    email_claimed_at timestamp with time zone,
    email_attempts integer DEFAULT 0 NOT NULL,
    emailed_at timestamp with time zone,
    href text,
    CONSTRAINT notifications_email_state_check CHECK ((email_state = ANY (ARRAY['not_required'::text, 'pending'::text, 'sending'::text, 'sent'::text, 'failed'::text])))
);

CREATE TABLE public.order_returns (
    return_id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id integer NOT NULL,
    user_id integer NOT NULL,
    kind text NOT NULL,
    reason text NOT NULL,
    details text NOT NULL,
    status text DEFAULT 'REQUESTED'::text NOT NULL,
    refund_amount_cents integer DEFAULT 0 NOT NULL,
    customer_message text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_returns_details_check CHECK (((char_length(details) >= 10) AND (char_length(details) <= 2000))),
    CONSTRAINT order_returns_kind_check CHECK ((kind = ANY (ARRAY['RETURN'::text, 'REFUND'::text]))),
    CONSTRAINT order_returns_reason_check CHECK ((reason = ANY (ARRAY['damaged'::text, 'wrong_item'::text, 'quality'::text, 'cancelled_paid'::text, 'other'::text]))),
    CONSTRAINT order_returns_refund_amount_cents_check CHECK ((refund_amount_cents >= 0)),
    CONSTRAINT order_returns_status_check CHECK ((status = ANY (ARRAY['REQUESTED'::text, 'APPROVED'::text, 'REJECTED'::text, 'RECEIVED'::text, 'REFUNDED'::text, 'CLOSED'::text])))
);

CREATE TABLE public.return_refund_attempts (
    attempt_id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_id uuid NOT NULL,
    actor_id integer,
    amount_cents integer NOT NULL,
    channel text NOT NULL,
    state text DEFAULT 'PROCESSING'::text NOT NULL,
    provider_refund_id text,
    payment_id text,
    reference text,
    is_test boolean NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT return_refund_attempts_amount_cents_check CHECK ((amount_cents > 0)),
    CONSTRAINT return_refund_attempts_channel_check CHECK ((channel = ANY (ARRAY['paymongo'::text, 'bank'::text, 'ewallet'::text, 'cash'::text]))),
    CONSTRAINT return_refund_attempts_state_check CHECK ((state = ANY (ARRAY['PROCESSING'::text, 'PENDING'::text, 'UNKNOWN'::text, 'SUCCEEDED'::text, 'FAILED'::text])))
);

CREATE TABLE public.return_events (
    event_id bigint NOT NULL,
    return_id uuid NOT NULL,
    actor_id integer,
    action text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.product_reviews (
    review_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    order_id integer NOT NULL,
    rating smallint NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_reviews_body_check CHECK (((char_length(btrim(body)) >= 10) AND (char_length(btrim(body)) <= 2000))),
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE public.business_applications (
    application_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    business_name text NOT NULL,
    business_type text NOT NULL,
    contact_details text NOT NULL,
    registration_number text NOT NULL,
    purchase_plan text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    admin_message text DEFAULT ''::text NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_applications_business_name_check CHECK (((char_length(business_name) >= 1) AND (char_length(business_name) <= 150))),
    CONSTRAINT business_applications_business_type_check CHECK (((char_length(business_type) >= 1) AND (char_length(business_type) <= 100))),
    CONSTRAINT business_applications_contact_details_check CHECK (((char_length(contact_details) >= 1) AND (char_length(contact_details) <= 300))),
    CONSTRAINT business_applications_purchase_plan_check CHECK (((char_length(purchase_plan) >= 10) AND (char_length(purchase_plan) <= 1500))),
    CONSTRAINT business_applications_registration_number_check CHECK (((char_length(registration_number) >= 1) AND (char_length(registration_number) <= 100))),
    CONSTRAINT business_applications_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'DECLINED'::text, 'REVOKED'::text])))
);

CREATE TABLE public.admin_audit_events (
    event_id bigint NOT NULL,
    actor_id integer NOT NULL,
    actor_name text NOT NULL,
    actor_email text NOT NULL,
    actor_role text NOT NULL,
    origin text NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    table_name text NOT NULL,
    before_data jsonb,
    after_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_audit_events_origin_check CHECK ((origin = ANY (ARRAY['admin'::text, 'refund_processing'::text])))
);

CREATE TABLE public.admin_events (
    event_id bigint NOT NULL,
    title text NOT NULL,
    href text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.admin_event_reads (
    user_id integer NOT NULL,
    event_id bigint NOT NULL
);

CREATE TABLE public.marketing_preferences (
    user_id integer NOT NULL,
    subscribed boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    unsubscribe_token uuid DEFAULT gen_random_uuid() NOT NULL,
    consented_at timestamp with time zone,
    unsubscribed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.marketing_campaigns (
    campaign_id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subject text NOT NULL,
    heading text NOT NULL,
    message text NOT NULL,
    image_url text DEFAULT ''::text NOT NULL,
    image_alt text DEFAULT ''::text NOT NULL,
    cta_label text DEFAULT ''::text NOT NULL,
    cta_path text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    site_url text,
    send_from text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    queued_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketing_campaigns_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'QUEUED'::text, 'COMPLETED'::text])))
);

CREATE TABLE public.marketing_deliveries (
    delivery_id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    user_id integer,
    email text NOT NULL,
    preference_version integer NOT NULL,
    unsubscribe_token uuid NOT NULL,
    state text DEFAULT 'PENDING'::text NOT NULL,
    claim_id uuid,
    claimed_at timestamp with time zone,
    first_attempt_at timestamp with time zone,
    attempts integer DEFAULT 0 NOT NULL,
    provider_email_id text,
    sent_at timestamp with time zone,
    CONSTRAINT marketing_deliveries_state_check CHECK ((state = ANY (ARRAY['PENDING'::text, 'SENDING'::text, 'SENT'::text, 'FAILED'::text, 'UNKNOWN'::text, 'SKIPPED'::text])))
);

CREATE TABLE public.store_settings (
    settings_id integer NOT NULL,
    config jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_settings_config_check CHECK ((jsonb_typeof(config) = 'object'::text)),
    CONSTRAINT store_settings_settings_id_check CHECK ((settings_id = 1)),
    CONSTRAINT store_settings_version_check CHECK ((version > 0))
);

CREATE TABLE public.auth_rate_limits (
    bucket_key text NOT NULL,
    attempts integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT auth_rate_limits_attempts_check CHECK ((attempts > 0))
);

-- Sequences owned by exported table columns (no current sequence values).
CREATE SEQUENCE public.admin_audit_events_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.admin_events_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.cart_cart_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.contact_messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.order_items_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.orders_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.products_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.return_events_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.user_address_address_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sequence ownership.
ALTER SEQUENCE public.admin_audit_events_event_id_seq OWNED BY public.admin_audit_events.event_id;

ALTER SEQUENCE public.admin_events_event_id_seq OWNED BY public.admin_events.event_id;

ALTER SEQUENCE public.cart_cart_id_seq OWNED BY public.cart.cart_id;

ALTER SEQUENCE public.contact_messages_message_id_seq OWNED BY public.contact_messages.message_id;

ALTER SEQUENCE public.order_items_order_items_id_seq OWNED BY public.order_items.order_items_id;

ALTER SEQUENCE public.orders_order_id_seq OWNED BY public.orders.order_id;

ALTER SEQUENCE public.products_product_id_seq OWNED BY public.products.product_id;

ALTER SEQUENCE public.return_events_event_id_seq OWNED BY public.return_events.event_id;

ALTER SEQUENCE public.user_address_address_id_seq OWNED BY public.user_address.address_id;

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;

-- Column sequence defaults.
ALTER TABLE ONLY public.admin_audit_events ALTER COLUMN event_id SET DEFAULT nextval('public.admin_audit_events_event_id_seq'::regclass);

ALTER TABLE ONLY public.admin_events ALTER COLUMN event_id SET DEFAULT nextval('public.admin_events_event_id_seq'::regclass);

ALTER TABLE ONLY public.cart ALTER COLUMN cart_id SET DEFAULT nextval('public.cart_cart_id_seq'::regclass);

ALTER TABLE ONLY public.contact_messages ALTER COLUMN message_id SET DEFAULT nextval('public.contact_messages_message_id_seq'::regclass);

ALTER TABLE ONLY public.order_items ALTER COLUMN order_items_id SET DEFAULT nextval('public.order_items_order_items_id_seq'::regclass);

ALTER TABLE ONLY public.orders ALTER COLUMN order_id SET DEFAULT nextval('public.orders_order_id_seq'::regclass);

ALTER TABLE ONLY public.products ALTER COLUMN product_id SET DEFAULT nextval('public.products_product_id_seq'::regclass);

ALTER TABLE ONLY public.return_events ALTER COLUMN event_id SET DEFAULT nextval('public.return_events_event_id_seq'::regclass);

ALTER TABLE ONLY public.user_address ALTER COLUMN address_id SET DEFAULT nextval('public.user_address_address_id_seq'::regclass);

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);

-- Primary keys and unique constraints.
ALTER TABLE ONLY public.admin_audit_events
    ADD CONSTRAINT admin_audit_events_pkey PRIMARY KEY (event_id);

ALTER TABLE ONLY public.admin_event_reads
    ADD CONSTRAINT admin_event_reads_pkey PRIMARY KEY (user_id, event_id);

ALTER TABLE ONLY public.admin_events
    ADD CONSTRAINT admin_events_pkey PRIMARY KEY (event_id);

ALTER TABLE ONLY public.auth_rate_limits
    ADD CONSTRAINT auth_rate_limits_pkey PRIMARY KEY (bucket_key);

ALTER TABLE ONLY public.business_applications
    ADD CONSTRAINT business_applications_pkey PRIMARY KEY (application_id);

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (cart_id);

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_user_product_unique UNIQUE (user_id, product_id);

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (message_id);

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (campaign_id);

ALTER TABLE ONLY public.marketing_deliveries
    ADD CONSTRAINT marketing_deliveries_campaign_id_email_key UNIQUE (campaign_id, email);

ALTER TABLE ONLY public.marketing_deliveries
    ADD CONSTRAINT marketing_deliveries_campaign_id_user_id_key UNIQUE (campaign_id, user_id);

ALTER TABLE ONLY public.marketing_deliveries
    ADD CONSTRAINT marketing_deliveries_pkey PRIMARY KEY (delivery_id);

ALTER TABLE ONLY public.marketing_preferences
    ADD CONSTRAINT marketing_preferences_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.marketing_preferences
    ADD CONSTRAINT marketing_preferences_unsubscribe_token_key UNIQUE (unsubscribe_token);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_event_key_key UNIQUE (event_key);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (order_items_id);

ALTER TABLE ONLY public.order_returns
    ADD CONSTRAINT order_returns_order_id_key UNIQUE (order_id);

ALTER TABLE ONLY public.order_returns
    ADD CONSTRAINT order_returns_pkey PRIMARY KEY (return_id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (review_id);

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_product_id_key UNIQUE (user_id, product_id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);

ALTER TABLE ONLY public.return_events
    ADD CONSTRAINT return_events_pkey PRIMARY KEY (event_id);

ALTER TABLE ONLY public.return_refund_attempts
    ADD CONSTRAINT return_refund_attempts_pkey PRIMARY KEY (attempt_id);

ALTER TABLE ONLY public.return_refund_attempts
    ADD CONSTRAINT return_refund_attempts_provider_refund_id_key UNIQUE (provider_refund_id);

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_pkey PRIMARY KEY (settings_id);

ALTER TABLE ONLY public.user_address
    ADD CONSTRAINT user_address_pkey PRIMARY KEY (address_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (user_id, product_id);

-- Indexes, including partial uniqueness rules.
CREATE INDEX admin_audit_actor_idx ON public.admin_audit_events USING btree (actor_id, created_at DESC, event_id DESC);

CREATE INDEX admin_audit_recent_idx ON public.admin_audit_events USING btree (created_at DESC, event_id DESC);

CREATE INDEX admin_audit_resource_idx ON public.admin_audit_events USING btree (resource_type, resource_id, event_id DESC);

CREATE INDEX admin_events_recent_idx ON public.admin_events USING btree (created_at DESC, event_id DESC);

CREATE INDEX auth_rate_limits_expiry_idx ON public.auth_rate_limits USING btree (expires_at);

CREATE INDEX business_applications_recent_idx ON public.business_applications USING btree (created_at DESC, application_id DESC);

CREATE INDEX business_applications_status_idx ON public.business_applications USING btree (status, created_at DESC, application_id DESC);

CREATE INDEX business_applications_user_idx ON public.business_applications USING btree (user_id, created_at DESC, application_id DESC);

CREATE UNIQUE INDEX business_one_active_idx ON public.business_applications USING btree (user_id) WHERE (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text]));

CREATE INDEX marketing_campaign_recent_idx ON public.marketing_campaigns USING btree (created_at DESC, campaign_id);

CREATE INDEX marketing_delivery_queue_idx ON public.marketing_deliveries USING btree (campaign_id, state);

CREATE INDEX marketing_subscribed_idx ON public.marketing_preferences USING btree (user_id) WHERE subscribed;

CREATE INDEX notifications_email_queue_idx ON public.notifications USING btree (order_id, created_at) WHERE (email_state = ANY (ARRAY['pending'::text, 'failed'::text, 'sending'::text]));

CREATE INDEX notifications_user_recent_idx ON public.notifications USING btree (user_id, created_at DESC, notification_id DESC);

CREATE INDEX notifications_user_unread_idx ON public.notifications USING btree (user_id) WHERE (read_at IS NULL);

CREATE INDEX order_returns_recent_idx ON public.order_returns USING btree (created_at DESC, return_id DESC);

CREATE UNIQUE INDEX orders_checkout_session_idx ON public.orders USING btree (paymongo_checkout_session_id) WHERE (paymongo_checkout_session_id IS NOT NULL);

CREATE UNIQUE INDEX orders_payment_intent_idx ON public.orders USING btree (paymongo_payment_intent_id) WHERE (paymongo_payment_intent_id IS NOT NULL);

CREATE UNIQUE INDEX orders_paymongo_payment_id_idx ON public.orders USING btree (paymongo_payment_id) WHERE (paymongo_payment_id IS NOT NULL);

CREATE INDEX orders_sales_date_idx ON public.orders USING btree (created_at) WHERE (payment_status = ANY (ARRAY['paid'::text, 'refunded'::text]));

CREATE UNIQUE INDEX orders_user_checkout_request_key_idx ON public.orders USING btree (user_id, checkout_request_key) WHERE (checkout_request_key IS NOT NULL);

CREATE INDEX product_reviews_recent_idx ON public.product_reviews USING btree (product_id, created_at DESC, review_id DESC);

CREATE INDEX return_events_case_idx ON public.return_events USING btree (return_id, event_id);

CREATE UNIQUE INDEX return_refund_active_idx ON public.return_refund_attempts USING btree (return_id) WHERE (state <> 'FAILED'::text);

CREATE INDEX return_refund_recent_idx ON public.return_refund_attempts USING btree (return_id, created_at DESC, attempt_id DESC);

CREATE INDEX wishlist_user_created_idx ON public.wishlist USING btree (user_id, created_at DESC, product_id DESC);

-- Foreign keys.
ALTER TABLE ONLY public.admin_event_reads
    ADD CONSTRAINT admin_event_reads_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.admin_events(event_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.admin_event_reads
    ADD CONSTRAINT admin_event_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.business_applications
    ADD CONSTRAINT business_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.business_applications
    ADD CONSTRAINT business_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.marketing_deliveries
    ADD CONSTRAINT marketing_deliveries_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(campaign_id);

ALTER TABLE ONLY public.marketing_deliveries
    ADD CONSTRAINT marketing_deliveries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.marketing_preferences
    ADD CONSTRAINT marketing_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);

ALTER TABLE ONLY public.order_returns
    ADD CONSTRAINT order_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id);

ALTER TABLE ONLY public.order_returns
    ADD CONSTRAINT order_returns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.user_address(address_id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id);

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.return_events
    ADD CONSTRAINT return_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.return_events
    ADD CONSTRAINT return_events_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.order_returns(return_id);

ALTER TABLE ONLY public.return_refund_attempts
    ADD CONSTRAINT return_refund_attempts_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.return_refund_attempts
    ADD CONSTRAINT return_refund_attempts_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.order_returns(return_id);

ALTER TABLE ONLY public.user_address
    ADD CONSTRAINT user_address_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

COMMIT;
