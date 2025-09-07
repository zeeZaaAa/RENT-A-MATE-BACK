import Admin from "../models/admin.js";
import bcrypt from "bcrypt";

const createAdmin = async (username, password) => {
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = new Admin({username, passwordHash})
    await admin.save();
    console.log(`Admin "${username}" created.`);
}
export default createAdmin