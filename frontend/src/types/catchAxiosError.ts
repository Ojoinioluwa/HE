import { isAxiosError } from "axios"

const catchAxiosError = (error: any, message: string) => {
    if (isAxiosError(error)) {
        console.log(message, error);
        const backendMessage = error.response?.data?.message || "An unexpected error occurred";
        // Instead of throwing Error(), just return the message:
        return backendMessage;
    }
    // unknown error type, return generic message:
    return "An unexpected error occurred";
};


export default catchAxiosError;