import Expense from "./ExpenseModel.js";

const formatUser = (user) => {
  if (!user?._id) {
    return user || null;
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const formatExpense = (expense) => ({
  id: expense._id,
  category: expense.category,
  amount: expense.amount,
  description: expense.description,
  expenseDate: expense.expenseDate,
  createdBy: formatUser(expense.createdBy),
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt,
});

const buildExpenseFilter = ({ category, month, year, startDate, endDate }) => {
  const filter = {};

  if (category) filter.category = category;

  if (month && year) {
    filter.expenseDate = {
      $gte: new Date(Date.UTC(Number(year), Number(month) - 1, 1)),
      $lt: new Date(Date.UTC(Number(year), Number(month), 1)),
    };
  } else if (year) {
    filter.expenseDate = {
      $gte: new Date(Date.UTC(Number(year), 0, 1)),
      $lt: new Date(Date.UTC(Number(year) + 1, 0, 1)),
    };
  } else if (startDate || endDate) {
    filter.expenseDate = {};

    if (startDate) filter.expenseDate.$gte = new Date(startDate);
    if (endDate) filter.expenseDate.$lte = new Date(endDate);
  }

  return filter;
};

export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find(buildExpenseFilter(req.query))
      .populate("createdBy", "name email role")
      .sort({ expenseDate: -1, createdAt: -1 });

    return res.status(200).json({
      expenses: expenses.map(formatExpense),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

export const createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      createdBy: req.user._id,
    });
    const populatedExpense = await Expense.findById(expense._id).populate(
      "createdBy",
      "name email role",
    );

    return res.status(201).json({ expense: formatExpense(populatedExpense) });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create expense",
      error: error.message,
    });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email role");

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json({ expense: formatExpense(expense) });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update expense",
      error: error.message,
    });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete expense",
      error: error.message,
    });
  }
};
