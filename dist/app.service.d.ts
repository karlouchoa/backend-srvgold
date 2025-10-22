export declare class AppService {
    getStatus(): {
        success: boolean;
        message: string;
        data: {
            uptime: number;
            timestamp: string;
        };
    };
}
