export type User = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    heConfig: HEConfig;
    phoneNumber: string;
}

export interface HEConfig {
    publicKey: string | null;      // Base64 encoded string
    evaluationKey: string | null;  // Base64 encoded Relin Keys
    wrappedSecretKey?: string;     // The AES-encrypted secret key string
    params: {
        polyModulusDegree: number;
        scale: number;
        scheme: "ckks" | "bfv" | "bgv";
    };
    isInitialized: boolean;
}

export type RegisterForm = User & {
    confirmPassword: string;
};

export type LocalSorageInfo = {
    token?: string;
    email?: string;
    firstName?: string;
}

export type Login = {
    email: string;
    password: string;
}

export type LoginResponse = {
    messsage: string;
    token: string;
    user: Partial<User>
}

export type RegisterResponse = {
    status: string;
    message: string;
}

export type VerifyEmail = {
    email: string;
    verificationCode: string;
}
