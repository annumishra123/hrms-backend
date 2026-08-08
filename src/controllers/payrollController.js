const User = require("../models/User");
const Payslip = require("../models/Payroll");
const PayrollRun = require("../models/PayrollRun");
const Attendance = require("../models/Attendance");

// ---------- date helpers: date field String "YYYY-MM-DD" hai ----------


// ---------- date helpers ----------
const pad2 = (n) => String(n).padStart(2, "0");

function getMonthDateRange(month, year) {
  const totalDays = new Date(year, month, 0).getDate();
  const startDate = `${year}-${pad2(month)}-01`;
  const endDate = `${year}-${pad2(month)}-${pad2(totalDays)}`;
  return { startDate, endDate, totalDays };
}

// Sunday=0, Saturday=6 — weekend check
function isWeekend(dateStr) {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

// ---------- ek employee ka ek month ka attendance summary ----------
async function getAttendanceSummary(userId, month, year) {
  const { startDate, endDate, totalDays } = getMonthDateRange(month, year);

  const records = await Attendance.find({
    employee: userId,
    date: { $gte: startDate, $lte: endDate },
  });

  // Quick lookup: date string -> status
  const recordMap = {};
  records.forEach((r) => { recordMap[r.date] = r.status; });

  let presentDays = 0;
  let paidLeaveDays = 0;
  let holidayDays = 0;
  let weekendDays = 0;
  let lopDays = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
    const status = recordMap[dateStr];
    const weekend = isWeekend(dateStr);

    if (status === "present") {
      presentDays += 1;
    } else if (status === "half-day") {
      presentDays += 0.5;
    } else if (status === "leave") {
      paidLeaveDays += 1;
    } else if (status === "holiday") {
      holidayDays += 1;
    } else if (weekend) {
      // Record hi nahi bana, lekin weekend hai — paid maana jaayega
      weekendDays += 1;
    } else {
      // Weekday hai aur "absent" ya koi record nahi — LOP
      lopDays += 1;
    }
  }

  const payableDays = presentDays + paidLeaveDays + holidayDays + weekendDays;

  return { totalDays, presentDays, paidLeaveDays, holidayDays, weekendDays, payableDays, lopDays };
}

// ---------- attendance ke hisab se salary calculate karo ----------
function buildSalarySnapshot(user, attendance) {
  const s = user.salary || {};
  const basic = s.basic || 0;
  const hra = s.hra || 0;
  const special = s.specialAllowance || 0;
  const other = s.otherAllowance || 0;
  const pf = s.pf || 0;
  const tax = s.professionalTax || 0;

  const grossMonthly = basic + hra + special + other;
  const perDayRate = attendance.totalDays > 0 ? grossMonthly / attendance.totalDays : 0;

  // Payable gross = per-day rate x (present + paid leave + holiday days)
  const payableGross = +(perDayRate * attendance.payableDays).toFixed(2);

  // PF/Professional Tax fixed hi kaate jaate hain (poora mahina), sirf earnings pro-rate hoti hain
  const net = +(payableGross - pf - tax).toFixed(2);

  return {
    basic, hra, special, other, pf, tax,
    perDayRate: +perDayRate.toFixed(2),
    net,
  };
}

// ---------- GET /payroll/overview ----------
exports.getPayrollOverview = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    const payslips = await Payslip.find({ month, year });
    const totalEmployees = await User.countDocuments({ isActive: true });

    if (payslips.length === 0) {
      return res.status(200).json({
        summary: {
          totalPayroll: 0, employeesPaid: 0, totalEmployees,
          pending: totalEmployees, avgSalary: 0,
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
    res.status(500).json({ message: "Payroll overview fetch karne me error aaya", error: err.message });
  }
};

async function getLast6MonthsTrend(month, year) {
  const trend = [];
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let m = month, y = year;
  for (let i = 5; i >= 0; i--) {
    let tm = m - i, ty = y;
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

    res.status(200).json({ payslips, totalCount, totalPages, currentPage: parseInt(page) });
  } catch (err) {
    console.error("getPayslips error:", err);
    res.status(500).json({ message: "Payslips fetch karne me error aaya", error: err.message });
  }
};

// ---------- POST /payroll/run ----------
exports.startPayrollRun = async (req, res) => {
  try {
    const { month, year } = req.body;
    const employees = await User.find({ isActive: true });

    if (employees.length === 0) {
      return res.status(400).json({ message: "Koi active employee nahi mila" });
    }

    const run = await PayrollRun.create({
      month, year, status: "queued",
      total: employees.length, processed: 0,
      createdBy: req.user?._id,
    });

    res.status(200).json({ runId: run._id, status: run.status, totalEmployees: employees.length });

    processPayrollRun(run._id, employees, month, year);
  } catch (err) {
    console.error("startPayrollRun error:", err);
    res.status(500).json({ message: "Payroll run start nahi ho paaya", error: err.message });
  }
};

// ---------- background: har employee ka attendance-based payslip banao ----------
async function processPayrollRun(runId, employees, month, year) {
  await PayrollRun.findByIdAndUpdate(runId, { status: "processing" });

  let processed = 0;
  const errors = [];

  for (const user of employees) {
    try {
      const attendance = await getAttendanceSummary(user._id, month, year);
      const salary = buildSalarySnapshot(user, attendance);

      await Payslip.findOneAndUpdate(
        { employee: user._id, month, year },
        {
          employee: user._id,
          empId: user.employeeId,
          name: user.name,
          designation: user.designation,
          avatar: user.profilePhoto,
          month, year,
          ...salary,
          totalDays: attendance.totalDays,
          presentDays: attendance.presentDays,
          paidLeaveDays: attendance.paidLeaveDays,
          lopDays: attendance.lopDays,
          payableDays: attendance.payableDays,
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

  await PayrollRun.findByIdAndUpdate(runId, { status: "completed", processed, errors });
}

// ---------- GET /payroll/run/:runId/status ----------
exports.getRunStatus = async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.runId);
    if (!run) return res.status(404).json({ message: "Run nahi mila" });
    res.status(200).json({ status: run.status, processed: run.processed, total: run.total, errors: run.errors });
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
      month: oldRun.month, year: oldRun.year, status: "queued",
      total: employees.length, processed: 0, createdBy: req.user?._id,
    });

    res.status(200).json({ runId: newRun._id, status: newRun.status, totalEmployees: employees.length });
    processPayrollRun(newRun._id, employees, oldRun.month, oldRun.year);
  } catch (err) {
    console.error("retryFailedRun error:", err);
    res.status(500).json({ message: "Retry start nahi ho paaya", error: err.message });
  }
};

// ---------- GET /payroll/salary-structure ----------
exports.getSalaryStructure = async (req, res) => {
  try {
    const { page = 1, limit = 25, search = "" } = req.query;
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    const totalCount = await User.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const employees = await User.find(filter)
      .select("employeeId name designation profilePhoto salary")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({ employees, totalCount, totalPages, currentPage: parseInt(page) });
  } catch (err) {
    console.error("getSalaryStructure error:", err);
    res.status(500).json({ message: "Salary structure fetch karne me error aaya", error: err.message });
  }
};

// ---------- PUT /payroll/salary-structure/:userId ----------
exports.updateSalaryStructure = async (req, res) => {
  try {
    const { basic, hra, specialAllowance, otherAllowance, pf, professionalTax } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        salary: {
          basic: basic || 0,
          hra: hra || 0,
          specialAllowance: specialAllowance || 0,
          otherAllowance: otherAllowance || 0,
          pf: pf || 0,
          professionalTax: professionalTax || 0,
        },
      },
      { new: true }
    ).select("employeeId name salary");

    if (!user) return res.status(404).json({ message: "Employee nahi mila" });
    res.status(200).json({ message: "Salary update ho gayi", employee: user });
  } catch (err) {
    console.error("updateSalaryStructure error:", err);
    res.status(500).json({ message: "Salary update nahi ho paayi", error: err.message });
  }
};