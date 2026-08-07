// const RegularizeRequest = require('../models/RegularizeRequest');
// const Attendance = require('../models/Attendance'); 
// // ---------- Employee: Naya request submit karo ----------
// exports.submitRegularizeRequest = async (req, res) => {
//   try {
//     const employeeId = req.user._id;
//     const { date, reason, requestedCheckInTime, requestedCheckOutTime, note } = req.body;

//     if (!date || !reason || !note) {
//       return res.status(400).json({ success: false, message: 'Date, reason, and note are required' });
//     }

//     // Future date allowed nahi
//     if (new Date(date) > new Date()) {
//       return res.status(400).json({ success: false, message: 'You cannot submit a request for a future date.' });
//     }

//     // Same date ke liye ek pehle se pending request ho to naya na banao
//     const existingPending = await RegularizeRequest.findOne({
//       employee: employeeId,
//       date,
//       status: 'pending',
//     });
//     if (existingPending) {
//       return res.status(400).json({
//         success: false,
//         message: 'A request for this date is already pending.',
//       });
//     }

//     const request = await RegularizeRequest.create({
//       employee: employeeId,
//       date,
//       reason,
//       requestedCheckInTime: requestedCheckInTime || null,
//       requestedCheckOutTime: requestedCheckOutTime || null,
//       note,
//     });

//     return res.status(201).json({ success: true, data: request });
//   } catch (err) {
//     console.error('submitRegularizeRequest error:', err);
//     return res.status(500).json({ success: false, message: 'The request could not be submitted.' });
//   }
// };

// // ---------- Employee: apni saari requests  (history) ----------
// exports.getMyRegularizeRequests = async (req, res) => {
//   try {
//     const employeeId = req.user._id;
//     const requests = await RegularizeRequest.find({ employee: employeeId })
//       .sort({ createdAt: -1 })
//       .populate('reviewedBy', 'name'); // manager ka naam dikhane ke liye

//     return res.status(200).json({ success: true, data: requests });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: 'Request could not be loaded' });
//   }
// };




// // ---------- Admin: saari pending (ya sab) requests dekho ----------
// exports.getAllRegularizeRequests = async (req, res) => {
//   try {
//     console.log("Admin fetching all regularize requests...");
    
//     const { status } = req.query; // ?status=pending  (optional filter)
//     const filter = status ? { status } : {};

//     const requests = await RegularizeRequest.find(filter)
//       .sort({ createdAt: -1 })
//       .populate('employee', 'name employeeId department profileImage');
//       console.log(requests,"data here...");
      

//     return res.status(200).json({ success: true, data: requests });
//   } catch (err) {
//     console.error('getAllRegularizeRequests error:', err); 
//     return res.status(500).json({ success: false, message: 'Request could not be loaded' });
//   }
// };

// // ---------- Admin: single request ki detail dekho ----------
// exports.getRegularizeRequestById = async (req, res) => {
//   try {
//     const request = await RegularizeRequest.findById(req.params.id)
//       .populate('employee', 'name employeeId department profileImage');

//     if (!request) {
//       return res.status(404).json({ success: false, message: 'Request not found' });
//     }

//     // Us date ka actual attendance bhi saath mein bhej do, taaki admin compare kar sake
//     const attendanceRecord = await Attendance.findOne({
//       employee: request.employee._id,
//       date: request.date,
//     });

//     return res.status(200).json({
//       success: true,
//       data: { request, currentAttendance: attendanceRecord || null },
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: 'Failed to load details.' });
//   }
// };

// // ---------- Admin: request ko APPROVE karo ----------
// exports.approveRegularizeRequest = async (req, res) => {
//   try {
//     const adminId = req.user._id;
//     const { id } = req.params;
//     const { managerComment } = req.body;

//     const request = await RegularizeRequest.findById(id);
//     if (!request) {
//       return res.status(404).json({ success: false, message: 'Request not found.' });
//     }
//     if (request.status !== 'pending') {
//       return res.status(400).json({ success: false, message: 'This request has already been reviewed.' });
//     }

//     // 🔴 Sabse important step: Attendance record ko dhundo ya banao, phir update karo
//     let attendance = await Attendance.findOne({
//       employee: request.employee,
//       date: request.date,
//     });

//     if (!attendance) {
//       // Agar us din ka koi record hi nahi tha (jaise poora din absent tha), naya bana do
//       attendance = new Attendance({
//         employee: request.employee,
//         date: request.date,
//         status: 'present',
//       });
//     }

//     // Requested time ko actual attendance mein daal do
//     if (request.requestedCheckInTime) {
//       const [h, m] = request.requestedCheckInTime.split(':').map(Number);
//       const checkInDate = new Date(request.date);
//       checkInDate.setHours(h, m, 0, 0);
//       attendance.checkIn = { time: checkInDate, method: 'regularized' };
//     }

//     if (request.requestedCheckOutTime) {
//       const [h, m] = request.requestedCheckOutTime.split(':').map(Number);
//       const checkOutDate = new Date(request.date);
//       checkOutDate.setHours(h, m, 0, 0);
//       attendance.checkOut = { time: checkOutDate, method: 'regularized' };
//     }

//     // Agar reason WFH tha, to status bhi update kar do
//     if (request.reason === 'wfh_not_marked') {
//       attendance.status = 'present';
//       attendance.workMode = 'wfh'; // agar aapke schema mein ye field hai
//     } else {
//       attendance.status = 'present';
//     }

//     await attendance.save();

//     // Request ko approved mark karo
//     request.status = 'approved';
//     request.reviewedBy = adminId;
//     request.managerComment = managerComment || null;
//     request.reviewedAt = new Date();
//     await request.save();

//     return res.status(200).json({ success: true, data: request });
//   } catch (err) {
//     console.error('approveRegularizeRequest error:', err);
//     return res.status(500).json({ success: false, message: 'Failed to approve the request.' });
//   }
// };

// // ---------- Admin: request ko REJECT karo ----------
// exports.rejectRegularizeRequest = async (req, res) => {
//   try {
//     const adminId = req.user._id;
//     const { id } = req.params;
//     const { managerComment } = req.body;

//     if (!managerComment || !managerComment.trim()) {
//       return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
//     }

//     const request = await RegularizeRequest.findById(id);
//     if (!request) {
//       return res.status(404).json({ success: false, message: 'Request not found.' });
//     }
//     if (request.status !== 'pending') {
//       return res.status(400).json({ success: false, message: 'This request has already been reviewed.' });
//     }

//     request.status = 'rejected';
//     request.reviewedBy = adminId;
//     request.managerComment = managerComment.trim();
//     request.reviewedAt = new Date();
//     await request.save();

//     return res.status(200).json({ success: true, data: request });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: 'Failed to reject the request.' });
//   }
// };




const RegularizeRequest = require('../models/RegularizeRequest');
const Attendance = require('../models/Attendance');

// ---------- Employee: Naya request submit karo ----------
exports.submitRegularizeRequest = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { date, reason, requestedCheckInTime, requestedCheckOutTime, note } = req.body;

    if (!date || !reason || !note) {
      return res.status(400).json({ success: false, message: 'Date, reason, and note are required' });
    }

    // Future date allowed nahi
    if (new Date(date) > new Date()) {
      return res.status(400).json({ success: false, message: 'You cannot submit a request for a future date.' });
    }

    // Same date ke liye ek pehle se pending request ho to naya na banao
    const existingPending = await RegularizeRequest.findOne({
      employee: employeeId,
      date,
      status: 'pending',
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'A request for this date is already pending.',
      });
    }

    const request = await RegularizeRequest.create({
      employee: employeeId,
      date,
      reason,
      requestedCheckInTime: requestedCheckInTime || null,
      requestedCheckOutTime: requestedCheckOutTime || null,
      note,
    });

    // 🔴 Populate karke bhejo taaki frontend ka mapRequestToUI (jo item.employee.name etc use karta hai) sahi se kaam kare
    const populatedRequest = await RegularizeRequest.findById(request._id)
      .populate('employee', 'name employeeId department profileImage');

    // 🔴 Admins/HR ko realtime notify karo naye request ke baare mein
    const io = req.app.get('io');
    if (io) {
      io.emit('regularize:new', populatedRequest);
      // Agar admins/hr ek alag room mein hain to isko use karo instead of global emit:
      // io.to('admin-room').emit('regularize:new', populatedRequest);
    }

    return res.status(201).json({ success: true, data: request });
  } catch (err) {
    console.error('submitRegularizeRequest error:', err);
    return res.status(500).json({ success: false, message: 'The request could not be submitted.' });
  }
};

// ---------- Employee: apni saari requests  (history) ----------
exports.getMyRegularizeRequests = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const requests = await RegularizeRequest.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .populate('reviewedBy', 'name'); // manager ka naam dikhane ke liye

    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error('getMyRegularizeRequests error:', err);
    return res.status(500).json({ success: false, message: 'Request could not be loaded' });
  }
};

// ---------- Admin: saari pending (ya sab) requests dekho ----------
exports.getAllRegularizeRequests = async (req, res) => {
  try {
    const { status } = req.query; // ?status=pending  (optional filter)
    const filter = status ? { status } : {};

    const requests = await RegularizeRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('employee', 'name employeeId department profileImage');

    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error('getAllRegularizeRequests error:', err);
    return res.status(500).json({ success: false, message: 'Request could not be loaded' });
  }
};

// ---------- Admin: single request ki detail dekho ----------
exports.getRegularizeRequestById = async (req, res) => {
  try {
    const request = await RegularizeRequest.findById(req.params.id)
      .populate('employee', 'name employeeId department profileImage');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Us date ka actual attendance bhi saath mein bhej do, taaki admin compare kar sake
    const attendanceRecord = await Attendance.findOne({
      employee: request.employee._id,
      date: request.date,
    });

    return res.status(200).json({
      success: true,
      data: { request, currentAttendance: attendanceRecord || null },
    });
  } catch (err) {
    console.error('getRegularizeRequestById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load details.' });
  }
};

// ---------- Admin: request ko APPROVE karo ----------
exports.approveRegularizeRequest = async (req, res) => {
  console.log("Admin approving regularize request...");
  
  try {
    const adminId = req.user._id;
    const { id } = req.params;
    const { managerComment } = req.body;
    console.log("Request ID:", req);

    const request = await RegularizeRequest.findById(id);
    console.log("Found request:", request);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This request has already been reviewed.' });
    }

    // 🔴 Sabse important step: Attendance record ko dhundo ya banao, phir update karo
    let attendance = await Attendance.findOne({
      employee: request.employee,
      date: request.date,
    });
    console.log("Found attendance record:", attendance);
    
    if (!attendance) {
      // Agar us din ka koi record hi nahi tha (jaise poora din absent tha), naya bana do
      attendance = new Attendance({
        employee: request.employee,
        date: request.date,
        status: 'present',
      });
    }

    // Requested time ko actual attendance mein daal do
    if (request.requestedCheckInTime) {
      const [h, m] = request.requestedCheckInTime.split(':').map(Number);
      const checkInDate = new Date(request.date);
      checkInDate.setHours(h, m, 0, 0);
      attendance.checkIn = { time: checkInDate, method: 'regularized' };
    }

    if (request.requestedCheckOutTime) {
      const [h, m] = request.requestedCheckOutTime.split(':').map(Number);
      const checkOutDate = new Date(request.date);
      checkOutDate.setHours(h, m, 0, 0);
      attendance.checkOut = { time: checkOutDate, method: 'regularized' };
    }

    // Agar reason WFH tha, to status bhi update kar do
    if (request.reason === 'wfh_not_marked') {
      attendance.status = 'present';
      attendance.workMode = 'wfh'; // agar aapke schema mein ye field hai
    } else {
      attendance.status = 'present';
    }

    await attendance.save();

    // Request ko approved mark karo
    request.status = 'approved';
    request.reviewedBy = adminId;
    request.managerComment = managerComment || null;
    request.reviewedAt = new Date();
    await request.save();

    // 🔴 Populate karke bhejo taaki frontend ka mapRequestToUI sahi se kaam kare
    const populatedRequest = await RegularizeRequest.findById(request._id)
      .populate('employee', 'name employeeId department profileImage')
      .populate('reviewedBy', 'name');

    // 🔴 Sabko realtime batao ki ye request update ho gayi (dusre admins + wo employee)
    const io = req.app.get('io');
    if (io) {
      io.emit('regularize:updated', populatedRequest);
      // Agar per-employee rooms use kar rahe ho (jaise employee apne user._id room mein join karta hai):
      // io.to(String(request.employee)).emit('regularize:updated', populatedRequest);
    }

    return res.status(200).json({ success: true, data: request });
  } catch (err) {
    console.error('approveRegularizeRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve the request.' });
  }
};

// ---------- Admin: request ko REJECT karo ----------
exports.rejectRegularizeRequest = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { id } = req.params;
    const { managerComment } = req.body;

    if (!managerComment || !managerComment.trim()) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
    }

    const request = await RegularizeRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This request has already been reviewed.' });
    }

    request.status = 'rejected';
    request.reviewedBy = adminId;
    request.managerComment = managerComment.trim();
    request.reviewedAt = new Date();
    await request.save();

    // 🔴 Populate karke bhejo taaki frontend ka mapRequestToUI sahi se kaam kare
    const populatedRequest = await RegularizeRequest.findById(request._id)
      .populate('employee', 'name employeeId department profileImage')
      .populate('reviewedBy', 'name');

    // 🔴 Sabko realtime batao ki ye request update ho gayi
    const io = req.app.get('io');
    if (io) {
      io.emit('regularize:updated', populatedRequest);
      // io.to(String(request.employee)).emit('regularize:updated', populatedRequest);
    }

    return res.status(200).json({ success: true, data: request });
  } catch (err) {
    console.error('rejectRegularizeRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject the request.' });
  }
};