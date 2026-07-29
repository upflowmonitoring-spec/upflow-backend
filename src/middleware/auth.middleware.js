const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma'); 


const authMiddleware = async(req,res,next) => {
    //console.log('middleware executed');
    try{
        const authHeaders = req.headers.authorization;

        if(!authHeaders){
            return res.status(401).json({
                success:false,
                message:'Access Denied'
            });
        }

        const token = authHeaders.split(' ')[1];

        const decoded = jwt.verify(
            token , process.env.JWT_SECRET
        );

        const user = await prisma.user.findUnique({
            where: {
                id: decoded.id
            }
        });

        if(!user) throw new Error('User Not Found');
       // console.log("Authenticated User:", user);

        req.user = user;
        next();
    }
    catch (error) {
    console.error("JWT VERIFY ERROR:", error);

    return res.status(401).json({
        success: false,
        message: "Invalid Token"
    });
}
};

module.exports = authMiddleware;