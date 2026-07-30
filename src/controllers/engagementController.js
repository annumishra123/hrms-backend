const { Announcement, Ticket } = require('../models/Engagement');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// ---------- Announcements ----------

exports.getAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({})
    .populate('postedBy', 'name')
    .sort('-createdAt');

  res.json({ success: true, data: announcements });
});

exports.createAnnouncement = asyncHandler(async (req, res) => {
  const { title, body, category, audience } = req.body;

  if (!title || !body) {
    throw new ApiError(400, 'title and body are required');
  }

  const announcement = await Announcement.create({
    title,
    body,
    category,
    audience,
    postedBy: req.user._id,
  });
  const populated = await announcement.populate('postedBy', 'name');
  // ---- SOCKET EMIT
  const io = req.app.get('io');
  io.emit('announcement:new', populated);
  res.status(201).json({ success: true, message: 'Announcement posted', data: announcement });
});

exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw new ApiError(404, 'Announcement not found');

  await announcement.deleteOne();
  const io = req.app.get('io');
  io.emit('announcement:deleted', { id: req.params.id });
  res.json({ success: true, message: 'Announcement deleted' });
});

// ---------- Helpdesk Tickets ----------

exports.createTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.create({ ...req.body, raisedBy: req.user._id });
  res.status(201).json({ success: true, message: 'Support ticket raised', data: ticket });
});

exports.getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({raisedBy: req.user._id}).sort('-createdAt');
  res.json({ success: true, data: tickets });
});

exports.getAllTickets = asyncHandler(async (req, res) => {
  const { status, category } = req.query;
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  const tickets = await Ticket.find(query).populate('raisedBy', 'name employeeId').sort('-createdAt');
  res.json({ success: true, data: tickets });
});

exports.addTicketComment = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  ticket.comments.push({ by: req.user._id, text });
  await ticket.save();
  res.json({ success: true, message: 'Comment added', data: ticket });
});

exports.updateTicketStatus = asyncHandler(async (req, res) => {
  const { status, assignedTo } = req.body;
  const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status, assignedTo }, { new: true });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  res.json({ success: true, message: 'Ticket updated', data: ticket });
});







