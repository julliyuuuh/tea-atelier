CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer',
  email VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  date_created DATE DEFAULT now(),
  phone_number VARCHAR(11) UNIQUE
);

CREATE TABLE products (
  product_id SERIAL PRIMARY KEY,
  product_name VARCHAR(150) NOT NULL,
  product_desc TEXT NOT NULL,
  product_image VARCHAR(255) DEFAULT NULL,
  category VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'NO STOCK'
);

CREATE TABLE user_address (
  address_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  address_line3 VARCHAR(255),
  default_address BOOLEAN DEFAULT FALSE,
  default_billing BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE cart (
  cart_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  product_id INT REFERENCES products(product_id),
  quantity INT DEFAULT 1,
  status VARCHAR(20)
);

CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  address_id INT REFERENCES user_address(address_id),
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  order_status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE order_items (
  order_items_id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(order_id),
  product_id INT REFERENCES products(product_id),
  quantity INT DEFAULT 1,
  price DECIMAL(10,2) NOT NULL
);

CREATE TABLE contact_messages (
  message_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new', -- new / read / replied
  admin_reply TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  replied_at TIMESTAMP
);


-- Uhh next time lets use headless CMS :D 
-- For now though this is fine lol.

-- For Content Management System (CMS)
CREATE TABLE homepage_hero (
  id SERIAL PRIMARY KEY,
  volume_label TEXT NOT NULL,
  eyebrow TEXT NOT NULL,
  heading TEXT NOT NULL,
  subheading TEXT NOT NULL,
  cta_text TEXT NOT NULL,
  cta_link TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_caption TEXT NOT NULL
);

CREATE TABLE homepage_promo (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  heading TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cta_text TEXT NOT NULL,
  cta_link TEXT NOT NULL
);

CREATE TABLE homepage_why_choose_us (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  copy TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE homepage_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE homepage_reviews (
  id SERIAL PRIMARY KEY,
  quote TEXT NOT NULL,
  name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE about_hero (
  id SERIAL PRIMARY KEY,
  heading TEXT NOT NULL,
  subheading TEXT NOT NULL
);

CREATE TABLE about_story (
  id SERIAL PRIMARY KEY,
  eyebrow TEXT NOT NULL,
  heading TEXT NOT NULL,
  paragraph_1 TEXT NOT NULL,
  paragraph_2 TEXT NOT NULL,
  image_url TEXT NOT NULL
);

CREATE TABLE about_pillars (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  copy TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE about_team (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE collections_intro (
  id SERIAL PRIMARY KEY,
  eyebrow TEXT NOT NULL,
  heading TEXT NOT NULL,
  subheading TEXT NOT NULL
);

CREATE TABLE collections_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE privacy_intro (
  id SERIAL PRIMARY KEY,
  heading TEXT NOT NULL,
  intro TEXT NOT NULL,
  last_updated TEXT NOT NULL
);

CREATE TABLE privacy_sections (
  id SERIAL PRIMARY KEY,
  heading TEXT NOT NULL,
  body TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);
