export type AddAuthorizeUser = {
    encryptedPassword: string;
    email: string;
    iv: string;
    expiresAt: Date;
    passwordId: string
}