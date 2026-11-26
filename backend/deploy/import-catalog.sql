\set ON_ERROR_STOP on
BEGIN;

SELECT u.user_id AS id
FROM users u
JOIN user_role ur ON ur.user_id = u.user_id
JOIN roles r ON r.role_id = ur.role_id
WHERE u.username = :'seller_username' AND r.role_name = 'ROLE_SELLER'
\gset catalog_seller_

INSERT INTO categories (category_id, category_name)
SELECT category_id, category_name
FROM jsonb_to_recordset(:'catalog'::jsonb -> 'categories')
    AS c(category_id bigint, category_name text);

INSERT INTO products (product_id, product_name, image, description, stock,
                      price, discount, special_price, category_id, seller_id)
SELECT product_id, product_name, image, description, stock,
       price, discount, special_price, category_id, :catalog_seller_id
FROM jsonb_to_recordset(:'catalog'::jsonb -> 'products')
    AS p(product_id bigint, product_name text, image text, description text,
         stock integer, price double precision, discount double precision,
         special_price double precision, category_id bigint);

SELECT setval(pg_get_serial_sequence('categories', 'category_id'),
              (SELECT max(category_id) FROM categories), true);

-- Hibernate reserves product IDs in blocks; advance beyond the imported IDs.
SELECT setval('products_seq',
              (SELECT max(product_id) FROM products)
              + (SELECT increment_by FROM pg_sequences
                 WHERE schemaname = 'public' AND sequencename = 'products_seq'), true);

COMMIT;

SELECT json_build_object('categories', (SELECT count(*) FROM categories),
                         'products', (SELECT count(*) FROM products),
                         'seller_id', :catalog_seller_id);
