import jwt from 'jsonwebtoken'
import Face from '../models/faceSchema.js'

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

        const isUser = await Face.findOne({ _id: decoded.id })

        if (!isUser) {
            return res.status(401).json({ success: false, msg: 'No Face found..' })
        } else {
            // Set the manager ID in the request object for later use
            req.employeeId = isUser._id
            next()
        }

    } catch (error) {
        console.error("Auth Middleware Error:", error.message)
        res.status(401).json({ success: false, msg: 'Not authorized, token failed' })
    }
}

export default protect