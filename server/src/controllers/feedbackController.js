const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const prisma = require('../db/prisma');

exports.submitFeedback = async (req, res) => {
  const { message, type } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Feedback message is required' });
  }
  try {
    const feedback = await prisma.feedback.create({
      data: { email: req.user.email, message: message.trim(), type: type || 'bug' },
    });
    console.log(`💬 Feedback received from ${req.user.email} (Type: ${type})`);

    await resend.emails.send({
      from: 'AntCapture <onboarding@resend.dev>',
      to: process.env.NOTIFY_EMAIL,
      subject: `💬 New Feedback (${type || 'bug'}) from ${req.user.email}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;">
          <h2 style="color:#6366f1;">New Feedback Received</h2>
          <p><strong>From:</strong> ${req.user.email}</p>
          <p><strong>Type:</strong> <span style="background:#e2e8f0;padding:2px 8px;border-radius:12px;font-size:12px;text-transform:uppercase;">${type || 'bug'}</span></p>
          <p><strong>Message:</strong></p>
          <blockquote style="background:#f1f5f9;padding:16px;border-radius:8px;border-left:4px solid #6366f1;">
            ${message.trim()}
          </blockquote>
          <p style="color:#94a3b8;font-size:12px;">Sent via AntCapture</p>
        </div>
      `,
    });

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
  } catch {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};