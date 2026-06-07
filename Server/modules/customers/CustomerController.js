import Customer from "./CustomerModel.js";

const formatCustomer = (customer) => ({
  id: customer._id,
  name: customer.name,
  phone: customer.phone,
  email: customer.email,
  address: customer.address,
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

const isDuplicateKeyError = (error) => error?.code === 11000;

export const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      customers: customers.map(formatCustomer),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({ customer: formatCustomer(customer) });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);

    return res.status(201).json({ customer: formatCustomer(customer) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Customer already exists" });
    }

    return res.status(500).json({
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({ customer: formatCustomer(customer) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Customer already exists" });
    }

    return res.status(500).json({
      message: "Failed to update customer",
      error: error.message,
    });
  }
};
