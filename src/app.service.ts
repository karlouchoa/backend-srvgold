import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      success: true,
      message: 'Servico disponivel.',
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
