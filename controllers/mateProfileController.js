import Mate from "../models/mates.js";

export const me = async (req, res) => {
  try {
    const userId = req.user.id;

    const mate = await Mate.findById(userId).lean();

    if (!mate) {
      return res.status(404).json({ message: "Mate profile not found" });
    }

    const mateProfile = {
      name: mate.name,
      surName: mate.surName,
      nickname: mate.nickname,
      introduce: mate.introduce,
      pic: mate.pic,
      skill: mate.skill,
      interest: mate.interest,
      city: mate.city,
      avaliable_date: mate.avaliable_date,
      avaliable_time: mate.avaliable_time,
      price_rate: mate.price_rate,
      review_rate: mate.review_rate,
    };

    return res.status(200).json(mateProfile);
  } catch (error) {
    console.error("get mateProfile Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const {
      name,
      surName,
      nickname,
      introduce,
      pic,
      skill,
      interest,
      city,
      avaliable_date,
      avaliable_time,
      price_rate,
    } = req.body;

    // VALIDATION
    const errors = {};

    if (!introduce || !introduce.trim())
      errors.introduce = "Introduce is required";
    if (!skill || !skill.trim()) errors.skill = "Skill is required";
    if (!interest || !interest.trim()) errors.interest = "Interest is required";
    if (!city || !city.trim()) errors.city = "City is required";
    if (!avaliable_date || !avaliable_date.trim())
      errors.avaliable_date = "Available date is required";

    // Price rate: positive integer
    let numericPrice = Number(price_rate);
    if (!numericPrice || !Number.isInteger(numericPrice) || numericPrice <= 0)
      errors.price_rate = "Price rate must be a positive integer";

    // Available time validation
    if (!Array.isArray(avaliable_time) || avaliable_time.length !== 2) {
      errors.avaliable_time = "Available time must have start and end";
    } else {
      const [start, end] = avaliable_time;
      if (!start || !end)
        errors.avaliable_time = "Start and end time are required";
      else if (start === end)
        errors.avaliable_time = "End time must be after start time";
      else if (parseInt(start.split(":")[0]) > parseInt(end.split(":")[0]))
        errors.avaliable_time = "End time must be after start time";
    }

    if (Object.keys(errors).length > 0) return res.status(400).json({ errors });

    // แปลง skill และ interest เป็น array จาก comma-separated string
    const skillArray = skill
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const interestArray = interest
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    // UPDATE
    const mate = await Mate.findByIdAndUpdate(
      req.user.id,
      {
        name,
        surName,
        nickname,
        introduce,
        pic,
        skill: skillArray,
        interest: interestArray,
        city,
        avaliable_date,
        avaliable_time,
        price_rate: numericPrice,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!mate) return res.status(404).json({ message: "Mate not found" });

    return res.status(200).json({ message: "Update success", data: mate });
  } catch (err) {
    console.error("UpdateMe Error:", err);
    return res
      .status(500)
      .json({ message: "Update error", error: err.message });
  }
};
