const User = require("../models/User");
const Payslip = require("../models/Payroll");
const PayrollRun = require("../models/PayrollRun");
const Attendance = require("../models/Attendance");
const PDFDocument = require("pdfkit");


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


const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ---------- GET /payroll/me — logged-in employee ki khud ki salary ----------
exports.getMyPayroll = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    // 1) Pehle check karo ki HR ne is month ka payslip already process kiya hai ya nahi
    let payslip = await Payslip.findOne({ employee: req.user._id, month, year });

    // 2) Agar payslip nahi bana, to live attendance + salary se calculate kar do
    if (!payslip) {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User nahi mila" });
      }

      const attendance = await getAttendanceSummary(user._id, month, year);
      const salary = buildSalarySnapshot(user, attendance);

      payslip = {
        basic: salary.basic,
        hra: salary.hra,
        special: salary.special,
        other: salary.other,
        pf: salary.pf,
        tax: salary.tax,
        net: salary.net,
        totalDays: attendance.totalDays,
        presentDays: attendance.presentDays,
        paidLeaveDays: attendance.paidLeaveDays,
        lopDays: attendance.lopDays,
        payableDays: attendance.payableDays,
      };
    }

    const earnings = [
      { label: "Basic", value: payslip.basic || 0 },
      { label: "HRA", value: payslip.hra || 0 },
      { label: "Special Allowance", value: payslip.special || 0 },
      { label: "Other Allowance", value: payslip.other || 0 },
    ].filter((e) => e.value > 0);

    const deductions = [
      { label: "Provident Fund", value: payslip.pf || 0 },
      { label: "Professional Tax", value: payslip.tax || 0 },
    ].filter((d) => d.value > 0);

    res.status(200).json({
      data: {
        month: `${MONTH_NAMES[month - 1]} ${year}`,
        takeHome: payslip.net || 0,
        earnings,
        deductions,
        totalDays: payslip.totalDays,
        presentDays: payslip.presentDays,
        paidLeaveDays: payslip.paidLeaveDays,
        lopDays: payslip.lopDays,
        payableDays: payslip.payableDays,
      },
    });
  } catch (err) {
    console.error("getMyPayroll error:", err);
    res.status(500).json({ message: "Payroll error", error: err.message });
  }
};


// ---------- GET /payroll/me/pdf — apni salary slip PDF download karo ----------
exports.downloadMyPayslipPDF = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User nahi mila" });
    }

    // Pehle processed payslip check karo, warna live calculate karo
    let payslip = await Payslip.findOne({ employee: req.user._id, month, year });

    let salaryData;
    let attendanceData;

    if (payslip) {
      salaryData = {
        basic: payslip.basic, hra: payslip.hra, special: payslip.special,
        other: payslip.other, pf: payslip.pf, tax: payslip.tax, net: payslip.net,
      };
      attendanceData = {
        totalDays: payslip.totalDays, presentDays: payslip.presentDays,
        paidLeaveDays: payslip.paidLeaveDays, lopDays: payslip.lopDays,
        payableDays: payslip.payableDays,
      };
    } else {
      attendanceData = await getAttendanceSummary(user._id, month, year);
      salaryData = buildSalarySnapshot(user, attendanceData);
    }

    const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
    const grossEarnings = salaryData.basic + salaryData.hra + salaryData.special + salaryData.other;
    const totalDeductions = salaryData.pf + salaryData.tax;

    // ---------- PDF banao ----------
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Payslip_${monthLabel.replace(" ", "_")}.pdf`
    );

    doc.pipe(res);

    // Header
    doc.fontSize(18).font("Helvetica-Bold").text("Salary Slip", { align: "center" });
    doc.fontSize(11).font("Helvetica").fillColor("#666").text(monthLabel, { align: "center" });
    doc.moveDown(1.5);
    doc.fillColor("#000");

    // Employee Info
    doc.fontSize(12).font("Helvetica-Bold").text("Employee Details");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Name: ${user.name || "-"}`);
    doc.text(`Employee ID: ${user.employeeId || "-"}`);
    doc.text(`Designation: ${user.designation || "-"}`);
    doc.moveDown(1);

    // Attendance summary
    doc.fontSize(12).font("Helvetica-Bold").text("Attendance Summary");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Total Days: ${attendanceData.totalDays}`);
    doc.text(`Present Days: ${attendanceData.presentDays}`);
    doc.text(`Paid Leave Days: ${attendanceData.paidLeaveDays}`);
    doc.text(`LOP Days: ${attendanceData.lopDays}`);
    doc.text(`Payable Days: ${attendanceData.payableDays}`);
    doc.moveDown(1);

    // Earnings table
    doc.fontSize(12).font("Helvetica-Bold").text("Earnings");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    drawRow(doc, "Basic", salaryData.basic);
    drawRow(doc, "HRA", salaryData.hra);
    drawRow(doc, "Special Allowance", salaryData.special);
    drawRow(doc, "Other Allowance", salaryData.other);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold");
    drawRow(doc, "Gross Earnings", grossEarnings);
    doc.font("Helvetica");
    doc.moveDown(1);

    // Deductions table
    doc.fontSize(12).font("Helvetica-Bold").text("Deductions");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    drawRow(doc, "Provident Fund", salaryData.pf);
    drawRow(doc, "Professional Tax", salaryData.tax);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold");
    drawRow(doc, "Total Deductions", totalDeductions);
    doc.font("Helvetica");
    doc.moveDown(1);

    // Net pay
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.5);
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#1a7f37");
    doc.text(`Net Pay: Rs. ${salaryData.net.toLocaleString("en-IN")}`, { align: "right" });
    doc.fillColor("#000");

    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica").fillColor("#999").text(
      "This is a system-generated payslip and does not require a signature.",
      { align: "center" }
    );

    doc.end();
  } catch (err) {
    console.error("downloadMyPayslipPDF error:", err);
    res.status(500).json({ message: "Payslip PDF generate karne me error aaya", error: err.message });
  }
};

// helper: label-value row (right aligned amount)
function drawRow(doc, label, value) {
  const y = doc.y;
  doc.text(label, 50, y);
  doc.text(`Rs. ${(value || 0).toLocaleString("en-IN")}`, 50, y, { align: "right", width: 495 });
  doc.moveDown(0.4);
}