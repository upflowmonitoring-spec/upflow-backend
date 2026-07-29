const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const AppError = require("../utils/AppError");

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

const registerUser = async(userData) => {
    //console.log('A');
    const existingUser = await prisma.user.findUnique({
        where: {
            email: userData.email
        }
    });

    if(existingUser) throw new AppError('User Already Exists', 409);

    //console.log('B');

    const hashedPassword = await bcrypt.hash(userData.password,10);

    //console.log('C');

    const user = await prisma.user.create({
        data: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword
        }
    });
    return {
    id: user.id,
    name: user.name,
    email: user.email
    };
}

const loginUser = async (email, password) => {

    const user = await prisma.user.findUnique({
        where: {
            email
        }
    });
    if (!user) {
        throw new AppError('Invalid Credentials', 401);
    }

    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch) {
        throw new AppError('Invalid Credentials', 401);
    }

    const token = generateToken(user);

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    };
};

const updateUser = async (userId, updateData) => {
    const { password, ...safeUpdateData } = updateData;

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: safeUpdateData
        });

        return {
            id: user.id,
            name: user.name,
            email: user.email
        };
    } catch (error) {
        if (error.code === "P2002") {
            throw new AppError("Email already exists.", 409);
        }

        throw error;
    }
};

const changePassword = async (userId, currentPassword, newPassword) => {
    // 1. Find the user in the database
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new AppError('User not found', 404);
    }

    // 2. Verify their current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw new AppError('Incorrect current password. Please try again.', 401);
    }

    // 3. Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update it in the database
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
    });

    return { message: "Password updated successfully" };
};



const deleteUser = async(userId) =>{
    const user = await prisma.user.delete({
        where: {
            id: userId
        }
    });

  //  if(!user) throw new AppError('User Not Found', 404);

    return {
    id: user.id,
    name: user.name
    };
};

const getUserProfile = async (userId) => {
    // 1. Get base user data
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true }
    });

    if (!user) throw new AppError('User not found', 404);

    // 2. REAL DATA FOR PIE CHART: Monitors grouped by Project
    const projects = await prisma.project.findMany({
        where: { userId: userId },
        include: { _count: { select: { monitors: true } } }
    });

    const monitorsByProject = projects.map(p => ({
        name: p.name,
        value: p._count.monitors // 'value' is required by Recharts PieChart
    })).filter(p => p.value > 0); // Only show projects that actually have monitors

    // 3. REAL DATA FOR BAR CHART: Global Incident Health
    const incidents = await prisma.incident.findMany({
        where: { monitor: { project: { userId: userId } } },
        select: { resolvedAt: true }
    });

    const activeIncidents = incidents.filter(i => !i.resolvedAt).length;
    const resolvedIncidents = incidents.filter(i => i.resolvedAt).length;

    const incidentStats = [
        { name: "Active Alerts", count: activeIncidents },
        { name: "Resolved", count: resolvedIncidents }
    ];

    const totalMonitors = projects.reduce((sum, p) => sum + p._count.monitors, 0);

    return {
        ...user,
        stats: {
            totalProjects: projects.length,
            totalMonitors,
            monitorsByProject,
            incidentStats
        }
    };
};

module.exports = {
    registerUser,
    loginUser,
    updateUser,
    deleteUser,
    changePassword,
    getUserProfile,
    generateToken
};