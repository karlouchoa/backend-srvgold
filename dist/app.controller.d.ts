import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getStatus(): {
        success: boolean;
        message: string;
        data: {
            uptime: number;
            timestamp: string;
        };
    };
}
