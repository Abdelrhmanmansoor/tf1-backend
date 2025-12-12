const User = require('../modules/shared/models/User');
const { AdministrativeTeam, AuditLog } = require('../models/admin');
const RegistrationCode = require('../models/RegistrationCode');
const Job = require('../modules/club/models/Job'); // Corrected import path

// ==========================================
// SYSTEM STATS & MONITORING
// ==========================================

exports.getSystemStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalClubs,
            totalPlayers,
            totalAdmins,
            activeTeams,
            totalJobs
        ] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ role: 'club' }),
            User.countDocuments({ role: 'player' }),
            User.countDocuments({ role: 'sports-administrator' }),
            AdministrativeTeam.countDocuments({ isActive: true }),
            Job.countDocuments({}) // Count jobs
        ]);

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    clubs: totalClubs,
                    players: totalPlayers,
                    admins: totalAdmins
                },
                teams: {
                    active: activeTeams
                },
                jobs: {
                    total: totalJobs
                },
                systemStatus: 'healthy',
                environment: process.env.NODE_ENV
            }
        });
    } catch (error) {
        console.error('Owner stats error:', error);
        res.status(500).json({ success: false, message: 'Stats failed' });
    }
};

exports.globalAudit = async (req, res) => {
    // Platform owner can see EVERYTHING
    try {
        const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(100);
        res.json({ success: true, data: logs });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// ==========================================
// USER MANAGEMENT (GOD MODE)
// ==========================================

exports.getAllUsers = async (req, res) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;
        const query = {};

        if (role) query.role = role;
        if (search) {
            query.$or = [
                { email: new RegExp(search, 'i') },
                { firstName: new RegExp(search, 'i') },
                { lastName: new RegExp(search, 'i') },
                { organizationName: new RegExp(search, 'i') }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .limit(parseInt(limit))
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        res.json({ success: true, data: users, pagination: { total, page, limit } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        // Owner can update ANYTHING
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');

        await AuditLog.create({
            userId: req.user ? req.user._id : null, // Might be null if owner bypasses auth middleware fully, strictly speaking owner middleware doesn't populate req.user unless we do it manually, but we have req.isOwner
            userType: 'sports-administrator', // Technically system/owner
            action: 'update',
            module: 'OwnerControl',
            description: `Owner updated user ${req.params.id}`,
            targetId: user._id
        });

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        // Hard delete or soft delete - Owner Choice. Let's do Soft Delete by default, maybe add a query param for hard.
        const { hard } = req.query;

        if (hard === 'true') {
            await User.findByIdAndDelete(req.params.id);
            res.json({ success: true, message: 'User PERMANENTLY deleted' });
        } else {
            await User.findByIdAndUpdate(req.params.id, { isDeleted: true, isActive: false });
            res.json({ success: true, message: 'User soft deleted' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// CLUB MANAGEMENT
// ==========================================

exports.getAllClubs = async (req, res) => {
    try {
        const clubs = await User.find({ role: 'club' }).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: clubs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// JOB MANAGEMENT
// ==========================================
// Assuming Jobs are ClubApplications or similar

exports.getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find({}).sort({ createdAt: -1 });
        res.json({ success: true, data: jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ==========================================
// SETTINGS & TOOLS
// ==========================================

exports.generateRegistrationCode = async (req, res) => {
    try {
        const { role, maxUses, notes } = req.body;

        // Simple random code generation
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        const newCode = await RegistrationCode.create({
            code,
            role: role || 'club',
            maxUses: maxUses || 1,
            notes,
            createdBy: 'PLATFORM_OWNER'
        });

        res.json({
            success: true,
            data: newCode,
            message: 'Code generated'
        });

    } catch (error) {
        console.error('Generate code error:', error);
        res.status(500).json({ success: false, message: 'Generation failed' });
    }
};
