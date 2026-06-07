import mongoose from "mongoose";
import { Brand, Category, Product, ProductVariant } from "./ProductModel.js";

const normalizeId = (value) => value?.toString();

const formatCategory = (category) => ({
  id: category._id,
  name: category.name,
  description: category.description,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const formatBrand = (brand) => ({
  id: brand._id,
  name: brand.name,
  createdAt: brand.createdAt,
  updatedAt: brand.updatedAt,
});

const formatVariant = (variant) => ({
  id: variant._id,
  productId: variant.productId,
  ram: variant.ram,
  storage: variant.storage,
  color: variant.color,
  sku: variant.sku,
  sellingPrice: variant.sellingPrice,
  costPrice: variant.costPrice,
  createdAt: variant.createdAt,
  updatedAt: variant.updatedAt,
});

const formatProduct = (product, variants = []) => ({
  id: product._id,
  name: product.name,
  category: product.categoryId?._id
    ? formatCategory(product.categoryId)
    : product.categoryId,
  brand: product.brandId?._id ? formatBrand(product.brandId) : product.brandId,
  description: product.description,
  image: product.image,
  variants: variants.map(formatVariant),
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const isDuplicateKeyError = (error) => error?.code === 11000;

const assertCategoryAndBrandExist = async (categoryId, brandId) => {
  const [category, brand] = await Promise.all([
    Category.findById(categoryId),
    Brand.findById(brandId),
  ]);

  if (!category) {
    return { status: 404, message: "Category not found" };
  }

  if (!brand) {
    return { status: 404, message: "Brand not found" };
  }

  return null;
};

const validateSkuConflicts = async (variants, productId = null) => {
  if (!variants?.length) {
    return null;
  }

  const skus = variants.map((variant) => variant.sku.toUpperCase());
  const uniqueSkus = new Set(skus);

  if (uniqueSkus.size !== skus.length) {
    return {
      status: 409,
      message: "Variant SKUs must be unique within the product",
    };
  }

  const query = { sku: { $in: [...uniqueSkus] } };

  if (productId) {
    query.productId = { $ne: productId };
  }

  const existingVariant = await ProductVariant.findOne(query);

  if (existingVariant) {
    return {
      status: 409,
      message: `SKU ${existingVariant.sku} is already used by another variant`,
    };
  }

  return null;
};

// variant
const createVariants = (productId, variants = []) => {
  if (!variants.length) {
    return [];
  }

  return ProductVariant.insertMany(
    variants.map((variant) => ({
      ...variant,
      productId,
    })),
  );
};

// Category
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    return res.status(200).json({
      categories: categories.map(formatCategory),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);

    return res.status(201).json({ category: formatCategory(category) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Category already exists" });
    }

    return res.status(500).json({
      message: "Failed to create category",
      error: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ category: formatCategory(category) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Category already exists" });
    }

    return res.status(500).json({
      message: "Failed to update category",
      error: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const productCount = await Product.countDocuments({
      categoryId: req.params.id,
    });

    if (productCount > 0) {
      return res.status(409).json({
        message: "Category cannot be deleted while products use it",
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

// Brand
export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });

    return res.status(200).json({
      brands: brands.map(formatBrand),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch brands",
      error: error.message,
    });
  }
};

export const createBrand = async (req, res) => {
  try {
    const brand = await Brand.create(req.body);

    return res.status(201).json({ brand: formatBrand(brand) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Brand already exists" });
    }

    return res.status(500).json({
      message: "Failed to create brand",
      error: error.message,
    });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    return res.status(200).json({ brand: formatBrand(brand) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Brand already exists" });
    }

    return res.status(500).json({
      message: "Failed to update brand",
      error: error.message,
    });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const productCount = await Product.countDocuments({
      brandId: req.params.id,
    });

    if (productCount > 0) {
      return res.status(409).json({
        message: "Brand cannot be deleted while products use it",
      });
    }

    const brand = await Brand.findByIdAndDelete(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    return res.status(200).json({ message: "Brand deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete brand",
      error: error.message,
    });
  }
};

// Products
export const getProducts = async (req, res) => {
  try {
    const { categoryId, brandId, search } = req.query;
    const filter = {};

    if (categoryId) filter.categoryId = categoryId;
    if (brandId) filter.brandId = brandId;
    if (search) filter.name = { $regex: search, $options: "i" };

    const products = await Product.find(filter)
      .populate("categoryId")
      .populate("brandId")
      .sort({ createdAt: -1 });

    const productIds = products.map((product) => product._id);
    const variants = await ProductVariant.find({
      productId: { $in: productIds },
    }).sort({ createdAt: 1 });

    const variantsByProduct = variants.reduce((map, variant) => {
      const key = normalizeId(variant.productId);
      const current = map.get(key) || [];
      current.push(variant);
      map.set(key, current);
      return map;
    }, new Map());

    return res.status(200).json({
      products: products.map((product) =>
        formatProduct(product, variantsByProduct.get(normalizeId(product._id))),
      ),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categoryId")
      .populate("brandId");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variants = await ProductVariant.find({ productId: product._id }).sort(
      {
        createdAt: 1,
      },
    );

    return res.status(200).json({ product: formatProduct(product, variants) });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

export const createProduct = async (req, res) => {
  let product;

  try {
    const {
      name,
      categoryId,
      brandId,
      description,
      image,
      variants = [],
    } = req.body;

    const referenceError = await assertCategoryAndBrandExist(
      categoryId,
      brandId,
    );

    if (referenceError) {
      return res.status(referenceError.status).json({
        message: referenceError.message,
      });
    }

    const skuError = await validateSkuConflicts(variants);

    if (skuError) {
      return res.status(skuError.status).json({ message: skuError.message });
    }

    product = await Product.create({
      name,
      categoryId,
      brandId,
      description,
      image,
    });

    const createdVariants = await createVariants(product._id, variants);
    const populatedProduct = await Product.findById(product._id)
      .populate("categoryId")
      .populate("brandId");

    return res.status(201).json({
      product: formatProduct(populatedProduct, createdVariants),
    });
  } catch (error) {
    if (product?._id) {
      await ProductVariant.deleteMany({ productId: product._id });
      await Product.findByIdAndDelete(product._id);
    }

    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Variant SKU already exists" });
    }

    return res.status(500).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { name, categoryId, brandId, description, image, variants } =
      req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const nextCategoryId = categoryId || product.categoryId;
    const nextBrandId = brandId || product.brandId;
    const referenceError = await assertCategoryAndBrandExist(
      nextCategoryId,
      nextBrandId,
    );

    if (referenceError) {
      return res.status(referenceError.status).json({
        message: referenceError.message,
      });
    }

    if (variants !== undefined) {
      const skuError = await validateSkuConflicts(
        variants,
        new mongoose.Types.ObjectId(req.params.id),
      );

      if (skuError) {
        return res.status(skuError.status).json({ message: skuError.message });
      }
    }

    if (name !== undefined) product.name = name;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (brandId !== undefined) product.brandId = brandId;
    if (description !== undefined) product.description = description;
    if (image !== undefined) product.image = image;

    await product.save();

    let productVariants = await ProductVariant.find({ productId: product._id });

    if (variants !== undefined) {
      await ProductVariant.deleteMany({ productId: product._id });
      productVariants = await createVariants(product._id, variants);
    }

    const populatedProduct = await Product.findById(product._id)
      .populate("categoryId")
      .populate("brandId");

    return res.status(200).json({
      product: formatProduct(populatedProduct, productVariants),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Variant SKU already exists" });
    }

    return res.status(500).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await ProductVariant.deleteMany({ productId: product._id });

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete product",
      error: error.message,
    });
  }
};
