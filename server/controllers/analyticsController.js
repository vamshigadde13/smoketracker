import Entry from "../models/entryModel.js";

const getAnalytics = async (req, res) => {
    try {
        const entries = await Entry.find({ userId: req.user._id }).lean();

        const totalSmokes = entries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
        const totalLogs = entries.length;
        const totalSpend = entries.reduce((sum, entry) => sum + (entry.cost || 0), 0);

        const brandCounts = {};
        const hourCounts = Array.from({ length: 24 }, () => 0);

        for (const entry of entries) {
            const brand = entry.brand || "Unknown";
            brandCounts[brand] = (brandCounts[brand] || 0) + (entry.quantity || 0);

            const hour = new Date(entry.timestamp).getHours();
            hourCounts[hour] += entry.quantity || 0;
        }

        const mostUsedBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0] || null;
        const peakHour = hourCounts
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)[0];

        res.status(200).json({
            success: true,
            analytics: {
                totalSmokes,
                totalLogs,
                totalSpend,
                mostUsedBrand: mostUsedBrand ? { brand: mostUsedBrand[0], count: mostUsedBrand[1] } : null,
                peakHour: peakHour && peakHour.count > 0 ? peakHour.hour : null,
                brandBreakdown: brandCounts
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch analytics",
            error: error.message
        });
    }
};

export { getAnalytics };
