export declare class PasswordService {
    private readonly logger;
    private readonly bcryptSaltRounds;
    hash(password: string): Promise<string>;
    verify(password: string, storedValue?: string | null): Promise<boolean>;
    private isHexOfLength;
}
