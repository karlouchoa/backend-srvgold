import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return standardized status response', () => {
      const response = appController.getStatus();

      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(response.data).toEqual(
        expect.objectContaining({
          uptime: expect.any(Number),
          timestamp: expect.any(String),
        }),
      );
    });
  });
});
