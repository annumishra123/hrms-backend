const { Announcement, Ticket } = require('../models/Engagement');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// ---------- Announcements ----------

exports.createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({ ...req.body, postedBy: req.user._id });
  res.status(201).json({ success: true, message: 'Announcement published', data: announcement });
});

exports.getAnnouncements = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const query = category ? { category } : {};
  const announcements = await Announcement.find(query).populate('postedBy', 'name').sort('-pinned -createdAt');
  res.json({ success: true, data: announcements });
});

exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);
  if (!announcement) throw new ApiError(404, 'Announcement not found');
  res.json({ success: true, message: 'Announcement removed' });
});

// ---------- Helpdesk Tickets ----------

exports.createTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.create({ ...req.body, raisedBy: req.user._id });
  res.status(201).json({ success: true, message: 'Support ticket raised', data: ticket });
});

exports.getMyTickets = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = { raisedBy: req.user._id };
  if (status) query.status = status;
  const tickets = await Ticket.find(query).sort('-createdAt');
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
