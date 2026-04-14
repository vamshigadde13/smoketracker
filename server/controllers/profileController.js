import Profile from "../models/profileModel.js";

const getProfile = async (req, res) => {
  try {
    const fallbackName = String(req.user?.displayName || req.user?.username || "").trim();
    let profile = await Profile.findOne({ userId: req.user._id });

    if (!profile) {
      profile = await Profile.create({
        userId: req.user._id,
        name: fallbackName,
        alias: "",
        bio: "",
      });
    } else if (!String(profile.name || "").trim() && fallbackName) {
      profile.name = fallbackName;
      await profile.save();
    }

    res.status(200).json({
      success: true,
      profile: {
        name: String(profile.name || "").trim(),
        alias: String(profile.alias || "").trim(),
        bio: String(profile.bio || "").trim(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profile", error: error.message });
  }
};

const upsertProfile = async (req, res) => {
  try {
    const fallbackName = String(req.user?.displayName || req.user?.username || "").trim();
    const requestedName = String(req.body?.name ?? "").trim();
    const update = {
      name: requestedName || fallbackName,
      alias: String(req.body?.alias ?? "").trim(),
      bio: String(req.body?.bio ?? "").trim(),
    };

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update, $setOnInsert: { userId: req.user._id } },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save profile", error: error.message });
  }
};

const deleteProfile = async (req, res) => {
  try {
    await Profile.findOneAndDelete({ userId: req.user._id });
    res.status(200).json({ success: true, message: "Profile cleared successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to clear profile", error: error.message });
  }
};

export { getProfile, upsertProfile, deleteProfile };
