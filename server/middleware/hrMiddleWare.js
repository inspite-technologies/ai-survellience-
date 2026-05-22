import jwt from 'jsonwebtoken'
import HR from '../models/hrSchema.js'
import Admin from '../models/adminSchema.js'

const protect = async (req, res, next) => {
    try {
        let token = req.headers.token

        if (!token) {
            return res.status(401).json({ success: false, msg: 'No token provided' })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        if (!decoded || !decoded.id) {
            return res.status(401).json({ success: false, msg: 'Invalid token structure' })
        }

        let isUser = await HR.findOne({ _id: decoded.id })

        // Also check Admin collection if not found in HR
        if (!isUser) {
            isUser = await Admin.findOne({ _id: decoded.id })
        }

        if (!isUser) {
            return res.status(401).json({ success: false, msg: 'No HR or Admin found..' })
        } else {
            // Set the ID and type in the request object
            req.hrId = isUser._id
            req.userType = isUser.role === 'Admin' || isUser.role === 'admin' ? 'Admin' : 'HR'
            next()
        }

    } catch (error) {
        console.error("Auth Middleware Error:", error.message)
        res.status(401).json({ success: false, msg: 'Not authorized, token failed' })
    }
}

export default protect