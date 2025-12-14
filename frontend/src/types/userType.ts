export type User = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string;
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
