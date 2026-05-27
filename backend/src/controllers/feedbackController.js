const prisma = require('../db/prisma');

exports.submitFeedback = async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Feedback message is required' });
  }
  try {
    const feedback = await prisma.feedback.create({
      data: { email: req.user.email, message: message.trim() },
    });
    console.log(`💬 Feedback received from ${req.user.email}`);
    res.json({ success: true, id: feedback.id });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
};

exports.getFeedback = async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ feedbacks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};