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