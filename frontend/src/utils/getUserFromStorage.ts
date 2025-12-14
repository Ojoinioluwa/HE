import type { LocalSorageInfo } from "../types/userType";


export const getUserFromStorage = (): LocalSorageInfo | null => {
    const stored = localStorage.getItem("userInfo");
    if (!stored) return null;
    try {
        const parsedUser = JSON.parse(stored)
        return parsedUser
    } catch (error) {
        console.log("Failed to parse user from storage", error)
        return null;
    }
}