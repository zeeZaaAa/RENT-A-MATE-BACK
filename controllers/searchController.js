import Mate from "../models/mates.js";
import Renter from "../models/renters.js";

export const searchMate = async (req, res) => {
  try {
    const {
      search = "",
      interest = "all",
      avaliable_date = "",
      minRate,
      page = 1,
      pageSize = 5,
    } = req.query;

    const searchStr = typeof search === "string" ? search.trim() : "";

    let interestArr = [];
    if (interest === "all") {
      interestArr = [];
    } else if (Array.isArray(interest)) {
      interestArr = interest.map((i) => String(i).trim()).filter(Boolean);
    } else if (typeof interest === "string") {
      interestArr = interest
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);
    }

    const validDates = ["weekdays", "weekends", "all"];
    const avaliableDateStr = validDates.includes(avaliable_date)
      ? avaliable_date
      : "";

    let minRateNum;
    if (minRate != null) {
      const n = Number(minRate);
      minRateNum = isNaN(n) ? undefined : Math.max(0, Math.min(5, n));
    }

    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const pageSafe = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
    const pageSizeSafe =
      Number.isInteger(pageSizeNum) && pageSizeNum > 0 ? pageSizeNum : 5;

    const query = {};

    if (searchStr) {
      query.$or = [
        { name: { $regex: searchStr, $options: "i" } },
        { surName: { $regex: searchStr, $options: "i" } },
        { city: { $regex: searchStr, $options: "i" } },
      ];
    }

    if (interestArr.length > 0) {
      query.interest = {
        $all: interestArr.map((i) => new RegExp(`^${i}$`, "i")),
      };
    }

    if (avaliableDateStr) {
      query.avaliable_date = avaliableDateStr;
    }

    if (minRateNum != null) {
      query.review_rate = { $gte: minRateNum };
    }

    const skip = (pageSafe - 1) * pageSizeSafe;
    const total = await Mate.countDocuments(query);
    const mates = await Mate.find(query).skip(skip).limit(pageSizeSafe);

    res.json({
      data: mates.map((m) => ({
        id: m._id,
        name: m.name,
        surName: m.surName,
        city: m.city,
        pic: m.pic,
        interest: m.interest,
        avaliable_date: m.avaliable_date,
        review_rate: m.review_rate ?? null,
      })),
      total,
      page: pageSafe,
      totalPages: Math.ceil(total / pageSizeSafe),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCity = (req, res) => {
  const city = [
    "bangkok",
    "amnatcharoen",
    "angthong",
    "bungkan",
    "buriram",
    "chachoengsao",
    "chainat",
    "chaiyaphum",
    "chanthaburi",
    "chiangmai",
    "chiangrai",
    "chonburi",
    "chumphon",
    "kalasin",
    "kamphaengphet",
    "kanchanaburi",
    "khonkaen",
    "krabi",
    "lampang",
    "lamphun",
    "loei",
    "lopburi",
    "maehongson",
    "mahasarakham",
    "mukdahan",
    "nakhonnayok",
    "nakhonpathom",
    "nakhonphanom",
    "nakhonratchasima",
    "nakhonsawan",
    "nakhonsithammarat",
    "nan",
    "narathiwat",
    "nongbualamphu",
    "nongkhai",
    "nonthaburi",
    "pathumthani",
    "pattani",
    "phangnga",
    "phatthalung",
    "phayao",
    "phetchabun",
    "phetchaburi",
    "phichit",
    "phitsanulok",
    "phranakhonsiayutthaya",
    "phrae",
    "phuket",
    "prachinburi",
    "prachapkhirikhan",
    "ranong",
    "ratchaburi",
    "rayong",
    "roiet",
    "sakaeo",
    "sakhonnakhon",
    "samutprakan",
    "samutsakhon",
    "samutsongkhram",
    "saraburi",
    "satun",
    "singburi",
    "sisaket",
    "songkhla",
    "sukhothai",
    "suphanburi",
    "suratthani",
    "surin",
    "tak",
    "trang",
    "trat",
    "ubonratchathani",
    "udonthani",
    "uthaithani",
    "uttaradit",
    "yala",
    "yasothon",
  ];
  return res.json(city);
};

export const getMateData = async (req, res) => {
  try {
    const { mateId } = req.query;

    const mate = await Mate.findById(mateId);

    if (!mate) {
      return res.status(404).json({ error: "Mate not found" });
    }

    const mateData = {
      id: mate._id,
      name: mate.name,
      surName: mate.surName,
      introduce: mate.introduce,
      nickname: mate.nickname,
      age: mate.birthDate,
      interest: mate.interest,
      skill: mate.skill,
      avaliable_date: mate.avaliable_date,
      avaliable_time: mate.avaliable_time,
      price_rate: mate.price_rate,
      review_rate: mate.review_rate,
      city: mate.city,
      pic: mate.pic,
    };

    return res.json(mateData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const isLiked = async (req, res) => {
  try {
    const renterId = req.user.id;
    const { mateId } = req.query;

    if (!renterId || !mateId) {
      return res.status(400).json({ message: "renterId and mateId are required" });
    }

    const renter = await Renter.findById(renterId).select("liked");
    if (!renter) {
      return res.status(404).json({ message: "Renter not found" });
    }

    const isLiked = renter.liked.some(
      (likedMateId) => likedMateId.toString() === mateId
    );

    return res.json({ isLiked });
  } catch (error) {
    console.error("Error in /search/isLiked:", error);
    res.status(500).json({ message: "Server error" });
  }
};