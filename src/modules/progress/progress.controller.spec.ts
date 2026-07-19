import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

describe('ProgressController', () => {
  let controller: ProgressController;
  let service: jest.Mocked<
    Pick<
      ProgressService,
      'getUserProgress' | 'getTrends' | 'getDeckProgress' | 'getLeeches'
    >
  >;
  const user = { id: 'u1' };

  beforeEach(() => {
    service = {
      getUserProgress: jest.fn(),
      getTrends: jest.fn(),
      getDeckProgress: jest.fn(),
      getLeeches: jest.fn(),
    };
    controller = new ProgressController(service as unknown as ProgressService);
  });

  it('getProgress delegates to getUserProgress with the tz offset', () => {
    controller.getProgress(user, { tzOffsetMinutes: 300 });
    expect(service.getUserProgress).toHaveBeenCalledWith('u1', 300);
  });

  it('getProgress passes undefined offset when unset (defaults to UTC)', () => {
    controller.getProgress(user, {});
    expect(service.getUserProgress).toHaveBeenCalledWith('u1', undefined);
  });

  it('getTrends passes the requested window and tz offset', () => {
    controller.getTrends(user, { days: 7, tzOffsetMinutes: 300 } as never);
    expect(service.getTrends).toHaveBeenCalledWith('u1', 7, 300);
  });

  it('getTrends defaults the window to 30 days when unset', () => {
    controller.getTrends(user, {} as never);
    expect(service.getTrends).toHaveBeenCalledWith('u1', 30, undefined);
  });

  it('getDeckProgress delegates to the service', () => {
    controller.getDeckProgress(user);
    expect(service.getDeckProgress).toHaveBeenCalledWith('u1');
  });

  it('getLeeches delegates to the service', () => {
    controller.getLeeches(user);
    expect(service.getLeeches).toHaveBeenCalledWith('u1');
  });
});
