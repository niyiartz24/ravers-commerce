const { asyncHandler } = require('../utils/errors');
const productService = require('../services/productService');

const listProducts = asyncHandler(async (req, res) => {
  const { search, category, featured, limit, exclude } = req.query;

  const products = await productService.list({
    search: search || undefined,
    category: category || undefined,
    featured: featured === 'true' ? true : undefined,
    limit: limit ? Number(limit) : undefined,
    excludeId: exclude ? Number(exclude) : undefined,
  });

  res.status(200).json({ success: true, data: { products, count: products.length } });
});

const listProductsAdmin = asyncHandler(async (req, res) => {
  const products = await productService.listAllForAdmin();
  res.status(200).json({ success: true, data: { products, count: products.length } });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getById(Number(req.params.id));
  res.status(200).json({ success: true, data: { product } });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body);
  res.status(201).json({ success: true, data: { product } });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.update(Number(req.params.id), req.body);
  res.status(200).json({ success: true, data: { product } });
});

const deleteProduct = asyncHandler(async (req, res) => {
  await productService.remove(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Product deleted.' });
});

module.exports = {
  listProducts,
  listProductsAdmin,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
