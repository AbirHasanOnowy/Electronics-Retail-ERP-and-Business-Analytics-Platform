import Supplier from "./SupplierModel.js";

const formatSupplier = (supplier) => ({
  id: supplier._id,
  name: supplier.name,
  phone: supplier.phone,
  email: supplier.email,
  address: supplier.address,
  createdAt: supplier.createdAt,
  updatedAt: supplier.updatedAt,
});

const isDuplicateKeyError = (error) => error?.code === 11000;

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });

    return res.status(200).json({
      suppliers: suppliers.map(formatSupplier),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch suppliers",
      error: error.message,
    });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);

    return res.status(201).json({ supplier: formatSupplier(supplier) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Supplier already exists" });
    }

    return res.status(500).json({
      message: "Failed to create supplier",
      error: error.message,
    });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.status(200).json({ supplier: formatSupplier(supplier) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Supplier already exists" });
    }

    return res.status(500).json({
      message: "Failed to update supplier",
      error: error.message,
    });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete supplier",
      error: error.message,
    });
  }
};
