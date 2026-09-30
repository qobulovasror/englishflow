import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminService } from '../admin.service';

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;
  let service: jest.Mocked<
    Pick<AdminService, 'overview' | 'signups' | 'engagement'>
  >;

  beforeEach(() => {
    service = {
      overview: jest.fn(),
      signups: jest.fn(),
      engagement: jest.fn(),
    };
    controller = new AdminDashboardController(
      service as unknown as AdminService,
    );
  });

  it('overview delegates to the service', async () => {
    await controller.overview();
    expect(service.overview).toHaveBeenCalled();
  });

  it('signups forwards the days window', async () => {
    await controller.signups({ days: 7 } as never);
    expect(service.signups).toHaveBeenCalledWith(7);
  });

  it('engagement delegates to the service', async () => {
    await controller.engagement();
    expect(service.engagement).toHaveBeenCalled();
  });
});
