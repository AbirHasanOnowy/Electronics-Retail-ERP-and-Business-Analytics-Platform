import Budget from "./BudgetModel.js";
import Expense from "../expenses/ExpenseModel.js";

const formatBudget = (budget, usage = {}) => {
  const spentAmount = usage.spentAmount || 0;
  const remainingAmount = budget.allocatedAmount - spentAmount;
  const utilizationPercent =
    budget.allocatedAmount > 0
      ? Number(((spentAmount / budget.allocatedAmount) * 100).toFixed(2))
      : 0;

  return {
    id: budget._id,
    month: budget.month,
    year: budget.year,
    category: budget.category,
    allocatedAmount: budget.allocatedAmount,
    spentAmount,
    remainingAmount,
    utilizationPercent,
    isOverBudget: remainingAmount < 0,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
};

const isDuplicateKeyError = (error) => error?.code === 11000;

const createDateRange = (month, year) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  return { startDate, endDate };
};

const buildBudgetFilter = ({ month, year, category }) => {
  const filter = {};

  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (category) filter.category = category;

  return filter;
};

const getUsageByBudgetKey = async (budgets) => {
  if (!budgets.length) {
    return new Map();
  }

  const budgetPeriods = budgets.map((budget) => ({
    key: `${budget.year}-${budget.month}-${budget.category}`,
    year: budget.year,
    month: budget.month,
    category: budget.category,
    ...createDateRange(budget.month, budget.year),
  }));

  const startDate = new Date(
    Math.min(...budgetPeriods.map((period) => period.startDate.getTime())),
  );
  const endDate = new Date(
    Math.max(...budgetPeriods.map((period) => period.endDate.getTime())),
  );
  const categories = [...new Set(budgetPeriods.map((period) => period.category))];

  const expenses = await Expense.aggregate([
    {
      $match: {
        category: { $in: categories },
        expenseDate: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$expenseDate" },
          month: { $month: "$expenseDate" },
          category: "$category",
        },
        spentAmount: { $sum: "$amount" },
      },
    },
  ]);

  return expenses.reduce((map, expense) => {
    const key = `${expense._id.year}-${expense._id.month}-${expense._id.category}`;

    map.set(key, { spentAmount: expense.spentAmount });

    return map;
  }, new Map());
};

export const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find(buildBudgetFilter(req.query)).sort({
      year: -1,
      month: -1,
      category: 1,
    });
    const usageByBudgetKey = await getUsageByBudgetKey(budgets);

    return res.status(200).json({
      budgets: budgets.map((budget) =>
        formatBudget(
          budget,
          usageByBudgetKey.get(`${budget.year}-${budget.month}-${budget.category}`),
        ),
      ),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch budgets",
      error: error.message,
    });
  }
};

export const createBudget = async (req, res) => {
  try {
    const budget = await Budget.create(req.body);
    const usageByBudgetKey = await getUsageByBudgetKey([budget]);

    return res.status(201).json({
      budget: formatBudget(
        budget,
        usageByBudgetKey.get(`${budget.year}-${budget.month}-${budget.category}`),
      ),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        message: "Budget already exists for this month, year, and category",
      });
    }

    return res.status(500).json({
      message: "Failed to create budget",
      error: error.message,
    });
  }
};

export const updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    const usageByBudgetKey = await getUsageByBudgetKey([budget]);

    return res.status(200).json({
      budget: formatBudget(
        budget,
        usageByBudgetKey.get(`${budget.year}-${budget.month}-${budget.category}`),
      ),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        message: "Budget already exists for this month, year, and category",
      });
    }

    return res.status(500).json({
      message: "Failed to update budget",
      error: error.message,
    });
  }
};
