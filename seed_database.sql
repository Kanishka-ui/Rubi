-- ============================================================
-- SQheLp Sample Database Seed
-- Run this to populate sqhelp_db with demo tables and data
-- ============================================================

USE sqhelp_db;

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    description   TEXT
);

-- ============================================================
-- TABLE: suppliers
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id   INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    city          VARCHAR(100),
    country       VARCHAR(100) DEFAULT 'India',
    phone         VARCHAR(20),
    email         VARCHAR(150)
);

-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    product_id    INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    category_id   INT,
    supplier_id   INT,
    price         DECIMAL(10,2) NOT NULL,
    stock         INT DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

-- ============================================================
-- TABLE: customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    customer_id   INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) UNIQUE,
    city          VARCHAR(100),
    phone         VARCHAR(20),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    order_id      INT AUTO_INCREMENT PRIMARY KEY,
    customer_id   INT,
    order_date    DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount  DECIMAL(10,2),
    status        ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    item_id       INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT,
    product_id    INT,
    quantity      INT NOT NULL,
    unit_price    DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- ============================================================
-- SEED DATA: categories
-- ============================================================
INSERT INTO categories (name, description) VALUES
('Electronics',   'Gadgets, devices and electronic accessories'),
('Clothing',      'Apparel, footwear and fashion accessories'),
('Home & Kitchen','Furniture, appliances and kitchenware'),
('Sports',        'Fitness equipment and sporting goods'),
('Books',         'Books, e-books and educational material');

-- ============================================================
-- SEED DATA: suppliers
-- ============================================================
INSERT INTO suppliers (name, city, country, phone, email) VALUES
('TechZone India Pvt Ltd',  'Mumbai',    'India', '9820001111', 'contact@techzone.in'),
('FashionHub',              'Delhi',     'India', '9811002222', 'info@fashionhub.in'),
('HomeComfort Traders',     'Pune',      'India', '9890003333', 'sales@homecomfort.in'),
('SportsPro Distributors',  'Bengaluru', 'India', '9845004444', 'orders@sportspro.in'),
('BookWorld Suppliers',     'Chennai',   'India', '9884005555', 'books@bookworld.in'),
('ABC Corp',                'Pune',      'India', '9870006666', 'abc@abccorp.in');

-- ============================================================
-- SEED DATA: products
-- ============================================================
INSERT INTO products (name, category_id, supplier_id, price, stock) VALUES
('Wireless Bluetooth Headphones',  1, 1, 2999.00,  50),
('Smartphone Stand',               1, 1,  499.00, 120),
('4K Smart TV 43 inch',            1, 1, 32999.00,  15),
('USB-C Hub 7-in-1',               1, 1, 1299.00,  80),
('Laptop Cooling Pad',             1, 1,  799.00,  60),
('Men Casual Shirt',               2, 2,  899.00, 200),
('Women Kurti Set',                2, 2, 1199.00, 150),
('Running Shoes',                  2, 2, 3499.00,  90),
('Denim Jeans',                    2, 2, 1599.00, 110),
('Non-stick Cookware Set',         3, 3, 4999.00,  30),
('Air Purifier',                   3, 3, 8999.00,  20),
('Wooden Bookshelf',               3, 3, 5499.00,  12),
('Coffee Maker',                   3, 3, 2799.00,  25),
('Yoga Mat',                       4, 4,  699.00, 100),
('Adjustable Dumbbell Set',        4, 4, 6999.00,  18),
('Cricket Bat (Kashmir Willow)',   4, 4, 1499.00,  40),
('Python Programming Handbook',    5, 5,  549.00,  75),
('Data Science Fundamentals',      5, 5,  649.00,  60),
('The Art of Leadership',          5, 5,  399.00,  90),
('Smart Watch Series X',           1, 1, 12999.00, 35);

-- ============================================================
-- SEED DATA: customers
-- ============================================================
INSERT INTO customers (name, email, city, phone) VALUES
('Rahul Sharma',    'rahul.sharma@email.com',   'Mumbai',    '9800011111'),
('Priya Patel',     'priya.patel@email.com',    'Ahmedabad', '9900022222'),
('Amit Joshi',      'amit.joshi@email.com',     'Pune',      '9870033333'),
('Sneha Gupta',     'sneha.gupta@email.com',    'Delhi',     '9811044444'),
('Vikram Nair',     'vikram.nair@email.com',    'Bengaluru', '9845055555'),
('Ananya Singh',    'ananya.singh@email.com',   'Chennai',   '9884066666'),
('Rohan Mehta',     'rohan.mehta@email.com',    'Hyderabad', '9899077777'),
('Kavya Reddy',     'kavya.reddy@email.com',    'Kolkata',   '9830088888'),
('Arjun Kapoor',    'arjun.kapoor@email.com',   'Jaipur',    '9820099999'),
('Meera Iyer',      'meera.iyer@email.com',     'Mumbai',    '9821010101');

-- ============================================================
-- SEED DATA: orders
-- ============================================================
INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES
(1,  '2026-04-01 10:30:00', 3498.00,  'delivered'),
(2,  '2026-04-05 14:00:00', 32999.00, 'delivered'),
(3,  '2026-04-10 09:15:00', 1298.00,  'delivered'),
(4,  '2026-04-12 11:45:00', 7698.00,  'shipped'),
(5,  '2026-04-15 16:00:00', 4999.00,  'processing'),
(6,  '2026-04-20 13:30:00', 13498.00, 'delivered'),
(7,  '2026-05-01 10:00:00', 2799.00,  'delivered'),
(8,  '2026-05-05 15:00:00', 1199.00,  'pending'),
(9,  '2026-05-08 12:00:00', 6999.00,  'processing'),
(10, '2026-05-10 09:00:00', 549.00,   'shipped'),
(1,  '2026-05-12 11:00:00', 12999.00, 'pending'),
(3,  '2026-05-13 14:30:00', 1499.00,  'pending');

-- ============================================================
-- SEED DATA: order_items
-- ============================================================
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1,  1,  1, 2999.00),
(1,  2,  1,  499.00),
(2,  3,  1, 32999.00),
(3,  4,  1, 1299.00),
(4,  15, 1, 6999.00),
(4,  14, 1,  699.00),
(5,  10, 1, 4999.00),
(6,  20, 1, 12999.00),
(6,  1,  1, 2999.00),  -- corrected: was missing comma before comment
(7,  13, 1, 2799.00),
(8,  7,  1, 1199.00),
(9,  15, 1, 6999.00),
(10, 17, 1,  549.00),
(11, 20, 1, 12999.00),
(12, 16, 1, 1499.00);

SELECT 'Database seeded successfully!' AS result;
SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.tables WHERE TABLE_SCHEMA = 'sqhelp_db';
