import Renter from "../models/renters.js";
import Mate from "../models/mates.js";

export const getLikedMates = async (req, res) => {
  try {
    const renterId = req.user.id; 
    const { page = 1, pageSize = 6 } = req.query;

    const renter = await Renter.findById(renterId).populate("liked");
    if (!renter) {
      return res.status(404).json({ message: "Renter not found" });
    }

    const totalLiked = renter.liked.length;
    const totalPages = Math.ceil(totalLiked / pageSize);

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + parseInt(pageSize);
    const mates = renter.liked.slice(startIndex, endIndex);

    res.json({
      mates: mates.map((m) => ({
        _id: m._id,
        name: m.name,
        surName: m.surName,
        nickname: m.nickname,
        profile: m.pic?.secure_url, 
        avaliable_date: m.avaliable_date,
        avaliable_time: m.avaliable_time,
        introduce: m.introduce,
        review_rate: m.review_rate,
        interest: m.interest,
      })),
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error("Error in getLikedMates:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const renterId = req.user.id;
    const { mateId } = req.body;

    if (!mateId) {
      return res.status(400).json({ message: "mateId require" });
    }

    const mate = await Mate.findById(mateId);
    if (!mate) {
      return res.status(404).json({ message: "Mate not found" });
    }

    const renter = await Renter.findById(renterId);
    if (!renter) {
      return res.status(404).json({ message: "Renter not found" });
    }

    const alreadyLiked = renter.liked.some(
      (id) => id.toString() === mateId.toString()
    );

    if (alreadyLiked) {
      renter.liked.pull(mateId);
      await renter.save();
      const populated = await renter.populate("liked", "name surName pic");
      return res.json({
        message: "Unliked success",
        liked: populated.liked,
      });
    } else {
      renter.liked.addToSet(mateId); 
      await renter.save();
      const populated = await renter.populate("liked", "name surName pic");
      return res.json({
        message: "Liked success",
        liked: populated.liked,
      });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

