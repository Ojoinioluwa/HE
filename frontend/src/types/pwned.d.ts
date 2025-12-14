declare module 'pwned' {
  export interface Breach {
    Name: string;
    Title: string;
    Domain: string;
    BreachDate: string;
    AddedDate: string;
    ModifiedDate?: string;
    PwnCount: number;
    Description: string;
    LogoPath: string;
    DataClasses: string[];
    IsVerified: boolean;
    IsFabricated: boolean;
    IsSensitive: boolean;
    IsRetired: boolean;
    IsSpamList: boolean;
  }

  interface Pwned {
    breachedAccount(email: string): Promise<Breach[]>;
    pwnedPassword(password: string): Promise<number>;
  }

  const pwned: Pwned;
  export default pwned;
}
