import Report from '../models/Report.js';
import FoodPost from '../models/FoodPost.js';

const generateReport = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const foodPosts = await FoodPost.find({
      status: 'verified',
      updatedAt: { $gte: startOfDay },
    });

    const foodSaved = foodPosts.reduce((sum, post) => sum + post.quantity, 0);
    const peopleServed = foodPosts.length * 5;
    const emissionsPrevented = foodSaved * 2.5;

    const report = new Report({
      date: new Date(),
      foodSaved,
      peopleServed,
      emissionsPrevented,
      createdBy: req.user._id,
    });

    await report.save();
    res.json({ message: 'Report generated', report });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export { generateReport };