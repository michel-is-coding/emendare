import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppInfo() {
    return {
      name: 'emendare-api',
      status: 'ok',
      docs: {
        health: '/health',
      },
    };
  }
}
