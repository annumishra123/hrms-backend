const User = require("../models/User"); 
const Payslip = require("../models/Payroll");
const PayrollRun = require("../models/PayrollRun");

// ---------- helper: User.salary se net pay calculate karo ----------
// User model me already netSalary() method hai, hum wahi use karenge
const buildSalarySnapshot = (user) => {
  const s = user.salary || {};
  const basic = s.basic || 0;
  const hra = s.hra || 0;
  const special = s.specialAllowance || 0;
  const other = s.otherAllowance || 0;
  const pf = s.pf || 0;
  const tax = s.professionalTax || 0;
  const net = user.netSalary(); // model ka existing method use kiya
  return { basic, hra, special, other, pf, tax, net };
};

// ---------- GET /payroll/overview ----------
exports.getPayrollOverview = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    const payslips = await Payslip.find({ month, year });
    // Sirf employees (role != admin/hr agar chaho to yahan filter kar sakte ho)
    const totalEmployees = await User.countDocuments({ isActive: true });

    if (payslips.length === 0) {
      return res.status(200).json({
        summary: {
          totalPayroll: 0,
          employeesPaid: 0,
          totalEmployees,
          pending: totalEmployees,
          avgSalary: 0,
        },
        trend: await getLast6MonthsTrend(month, year),
      });
    }

    const totalPayroll = payslips.reduce((sum, p) => sum + p.net, 0);
    const avgSalary = Math.round(totalPayroll / payslips.length);

    res.status(200).json({
      summary: {
        totalPayroll,
        employeesPaid: payslips.length,
        totalEmployees,
        pending: totalEmployees - payslips.length,
        avgSalary,
      },
      trend: await getLast6MonthsTrend(month, year),
    });
  } catch (err) {
    console.error("getPayrollOverview error:", err);
    res.status(500).json({ message: "Payroll overview fetch  error ", error: err.message });
  }
};

async function getLast6MonthsTrend(month, year) {
  const trend = [];
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  let m = month;
  let y = year;
  for (let i = 5; i >= 0; i--) {
    let tm = m - i;
    let ty = y;
    if (tm <= 0) { tm += 12; ty -= 1; }

    const slips = await Payslip.find({ month: tm, year: ty });
    const total = slips.reduce((sum, p) => sum + p.net, 0);

    trend.push({ month: MONTH_NAMES[tm - 1], amount: +(total / 10000000).toFixed(2) });
  }
  return trend;
}

// ---------- GET /payroll/payslips ----------
exports.getPayslips = async (req, res) => {
  try {
    const { page = 1, limit = 25, search = "", status = "", month, year } = req.query;

    const filter = { month: parseInt(month), year: parseInt(year) };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { empId: { $regex: search, $options: "i" } },
      ];
    }

    const totalCount = await Payslip.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const payslips = await Payslip.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      payslips,
      totalCount,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error("getPayslips error:", err);
    res.status(500).json({ message: "Payslips fetch  error ", error: err.message });
  }
};

// ---------- POST /payroll/run ----------
exports.startPayrollRun = async (req, res) => {
  try {
    const { month, year } = req.body;

    // Sirf active employees ka payroll banega. Agar HR/Admin ko exclude karna ho
    // to yahan role: { $nin: ["hr", "admin"] } add kar sakte ho.
    const employees = await User.find({ isActive: true });

    if (employees.length === 0) {
      return res.status(400).json({ message: "No active employee " });
    }

    const run = await PayrollRun.create({
      month,
      year,
      status: "queued",
      total: employees.length,
      processed: 0,
      createdBy: req.user?._id,
    });

    res.status(200).json({
      runId: run._id,
      status: run.status,
      totalEmployees: employees.length,
    });

    processPayrollRun(run._id, employees, month, year);
  } catch (err) {
    console.error("startPayrollRun error:", err);
    res.status(500).json({ message: "Payroll run start nahi ho paaya", error: err.message });
  }
};

// ---------- background me har employee ka payslip banata hai ----------
async function processPayrollRun(runId, employees, month, year) {
  await PayrollRun.findByIdAndUpdate(runId, { status: "processing" });

  let processed = 0;
  const errors = [];

  for (const user of employees) {
    try {
      const { basic, hra, special, other, pf, tax, net } = buildSalarySnapshot(user);

      await Payslip.findOneAndUpdate(
        { employee: user._id, month, year },
        {
          employee: user._id,
          empId: user.employeeId,
          name: user.name,
          designation: user.designation,
          avatar: user.profilePhoto,
          month,
          year,
          basic,
          hra,
          special,
          other,
          pf,
          tax,
          net,
          status: "processed",
          runId,
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      errors.push({ empId: user.employeeId, name: user.name, reason: err.message });
    }

    processed++;

    if (processed % 10 === 0 || processed === employees.length) {
      await PayrollRun.findByIdAndUpdate(runId, { processed, errors });
    }
  }

  await PayrollRun.findByIdAndUpdate(runId, {
    status: "completed",
    processed,
    errors,
  });
}

// ---------- GET /payroll/run/:runId/status ----------
exports.getRunStatus = async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.runId);
    if (!run) return res.status(404).json({ message: "Run nahi mila" });

    res.status(200).json({
      status: run.status,
      processed: run.processed,
      total: run.total,
      errors: run.errors,
    });
  } catch (err) {
    console.error("getRunStatus error:", err);
    res.status(500).json({ message: "Run status fetch karne me error aaya", error: err.message });
  }
};

// ---------- POST /payroll/run/:runId/retry ----------
exports.retryFailedRun = async (req, res) => {
  try {
    const oldRun = await PayrollRun.findById(req.params.runId);
    if (!oldRun) return res.status(404).json({ message: "Run nahi mila" });

    if (!oldRun.errors || oldRun.errors.length === 0) {
      return res.status(400).json({ message: "Koi failed employee nahi hai retry karne ke liye" });
    }

    const failedEmpIds = oldRun.errors.map((e) => e.empId);
    const employees = await User.find({ employeeId: { $in: failedEmpIds } });

    const newRun = await PayrollRun.create({
      month: oldRun.month,
      year: oldRun.year,
      status: "queued",
      total: employees.length,
      processed: 0,
      createdBy: req.user?._id,
    });

    res.status(200).json({
      runId: newRun._id,
      status: newRun.status,
      totalEmployees: employees.length,
    });

    processPayrollRun(newRun._id, employees, oldRun.month, oldRun.year);
  } catch (err) {
    console.error("retryFailedRun error:", err);
    res.status(500).json({ message: "Retry start nahi ho paaya", error: err.message });
  }
};