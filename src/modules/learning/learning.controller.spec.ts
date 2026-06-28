import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';

describe('LearningController', () => {
  let controller: LearningController;
  let service: jest.Mocked<Pick<LearningService, 'getDailyWords' | 'reviewWord'>>;
  const user = { id: 'u1' };

  beforeEach(() => {
    service = {
      getDailyWords: jest.fn(),
      reviewWord: jest.fn(),
    };
    controller = new LearningController(service as unknown as LearningService);
  });

  it('getDailyWords delegates to the service with the user id', () => {
    controller.getDailyWords(user);
    expect(service.getDailyWords).toHaveBeenCalledWith('u1');
  });

  it('reviewWord forwards the dto and user id', () => {
    const dto = { userWordId: 'uw1', rating: 'GOOD' } as never;
    controller.reviewWord(dto, user);
    expect(service.reviewWord).toHaveBeenCalledWith(dto, 'u1');
  });
});
