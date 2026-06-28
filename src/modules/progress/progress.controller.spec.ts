import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

describe('ProgressController', () => {
  let controller: ProgressController;
  let service: jest.Mocked<
    Pick<ProgressService, 'getUserProgress' | 'getTrends' | 'getDeckProgress' | 'getLeeches'>
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

  it('getProgress delegates to getUserProgress', () => {
    controller.getProgress(user);
    expect(service.getUserProgress).toHaveBeenCalledWith('u1');
  });

  it('getTrends passes the requested window', () => {
    controller.getTrends(user, { days: 7 } as never);
    expect(service.getTrends).toHaveBeenCalledWith('u1', 7);
  });

  it('getTrends defaults the window to 30 days when unset', () => {
    controller.getTrends(user, {} as never);
    expect(service.getTrends).toHaveBeenCalledWith('u1', 30);
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
