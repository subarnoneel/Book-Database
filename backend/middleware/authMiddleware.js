export const verifyLogin = (req, res, next) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        next();
    }
    else {
        res.status(401).json({ message: "Invalid credentials" });
    }
};