-- RAVERS E-Commerce — seed data
-- Run after schema.sql. Safe to re-run: clears existing product rows first.
-- Images are neutral placeholders (placehold.co) — swap image_url values for
-- real RAVERS photography before launch.
--
-- NOTE: the initial admin account is intentionally NOT created here because a
-- real password needs bcrypt hashing, not a raw SQL value. Run
-- `npm run create-admin` from /server after this file (see README).

BEGIN;

TRUNCATE TABLE order_items, orders, custom_orders, products RESTART IDENTITY CASCADE;

INSERT INTO products
    (name, slug, description, price, category, image_url, sizes, material, featured)
VALUES
(
    'Identity Oversized Tee',
    'identity-oversized-tee',
    'A boxy, heavyweight tee built as a blank canvas for self-expression. Dropped shoulders, a wide neckline, and a longer hem for an off-duty silhouette.',
    18500,
    'T-Shirts',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Identity+Oversized+Tee&font=montserrat',
    ARRAY['S','M','L','XL','XXL'],
    '240gsm combed cotton',
    TRUE
),
(
    'Monochrome Ribbed Tee',
    'monochrome-ribbed-tee',
    'A close-knit ribbed tee with a slight stretch. Cut slim through the body with a clean crew neck for a considered, minimal base layer.',
    16000,
    'T-Shirts',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Monochrome+Ribbed+Tee&font=montserrat',
    ARRAY['XS','S','M','L','XL'],
    '95% cotton, 5% elastane rib',
    FALSE
),
(
    'Lagos Grid Graphic Tee',
    'lagos-grid-graphic-tee',
    'A regular-fit tee carrying a minimal grid print inspired by the city skyline. Screen-printed in a single tone for a considered, not-loud graphic.',
    19500,
    'T-Shirts',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Lagos+Grid+Graphic+Tee&font=montserrat',
    ARRAY['S','M','L','XL'],
    '220gsm combed cotton',
    FALSE
),
(
    'Signature Heavyweight Hoodie',
    'signature-heavyweight-hoodie',
    'The house hoodie. Brushed-back fleece, a dropped shoulder seam, and a kangaroo pocket built deep enough to actually use.',
    42000,
    'Hoodies',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Signature+Heavyweight+Hoodie&font=montserrat',
    ARRAY['S','M','L','XL','XXL'],
    '400gsm brushed fleece',
    TRUE
),
(
    'Off-Duty Zip Hoodie',
    'off-duty-zip-hoodie',
    'A full-zip hoodie in a mid-weight fleece, cut for layering. Ribbed cuffs and hem keep the shape after repeated wear.',
    47500,
    'Hoodies',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Off-Duty+Zip+Hoodie&font=montserrat',
    ARRAY['S','M','L','XL'],
    '320gsm cotton-poly fleece',
    FALSE
),
(
    'Editorial Oxford Shirt',
    'editorial-oxford-shirt',
    'A structured oxford shirt with a clean point collar and a slightly cropped body. Reads sharp buttoned up or worn open over a tee.',
    32000,
    'Shirts',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Editorial+Oxford+Shirt&font=montserrat',
    ARRAY['S','M','L','XL'],
    '100% cotton oxford',
    TRUE
),
(
    'Boxy Linen Shirt',
    'boxy-linen-shirt',
    'A relaxed, boxy linen shirt with a camp collar. Breathable and unlined for warm-weather wear, styled to be worn open or fully buttoned.',
    29500,
    'Shirts',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Boxy+Linen+Shirt&font=montserrat',
    ARRAY['S','M','L','XL'],
    '100% linen',
    FALSE
),
(
    'Utility Overshirt',
    'utility-overshirt',
    'A twill overshirt with double chest pockets and a straight hem, built to sit between a shirt and a light jacket in the rotation.',
    36000,
    'Shirts',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Utility+Overshirt&font=montserrat',
    ARRAY['M','L','XL','XXL'],
    'Cotton twill',
    FALSE
),
(
    'Structured Bomber Jacket',
    'structured-bomber-jacket',
    'A tailored bomber with a clean ribbed collar and hem, cut with enough room to layer a hoodie underneath without losing its shape.',
    68000,
    'Jackets',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Structured+Bomber+Jacket&font=montserrat',
    ARRAY['S','M','L','XL'],
    'Cotton-nylon shell, poly lining',
    TRUE
),
(
    'Trench Coat, Unlined',
    'trench-coat-unlined',
    'An unlined trench in a mid-weight cotton twill, cut long. A belt at the waist and storm flaps keep the silhouette clean, not costume-y.',
    89000,
    'Jackets',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Trench+Coat+Unlined&font=montserrat',
    ARRAY['S','M','L','XL'],
    'Cotton twill',
    FALSE
),
(
    'Two-Piece Track Set',
    'two-piece-track-set',
    'A matching zip jacket and jogger set in a soft-touch tricot. Tapered leg, elastic waist with a drawcord, and zip cuffs on the jacket.',
    54000,
    'Sets',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Two-Piece+Track+Set&font=montserrat',
    ARRAY['S','M','L','XL'],
    'Tricot poly blend',
    FALSE
),
(
    'Wordmark Cap',
    'wordmark-cap',
    'A structured six-panel cap with an embroidered wordmark at the front and an adjustable strap at the back.',
    12500,
    'Accessories',
    'https://placehold.co/800x1000/FAFAF7/121214?text=Wordmark+Cap&font=montserrat',
    ARRAY['One Size'],
    'Cotton twill',
    TRUE
);

COMMIT;
