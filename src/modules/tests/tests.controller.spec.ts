import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

describe('TestsController', () => {
  let controller: TestsController;
  let service: jest.Mocked<Pick<TestsService, 'startTest' | 'submitTest'>>;
  const user = { id: 'u1' };

  beforeEach(() => {
    service = {
      startTest: jest.fn(),
      submitTest: jest.fn(),
    };
    controller = new TestsController(service as unknown as TestsService);
  });

  it('startTest delegates to the service with the user id', () => {
    controller.startTest(user);
    expect(service.startTest).toHaveBeenCalledWith('u1');
  });

  it('submitTest forwards the dto and user id', () => {
    const dto = { testId: 't1', answers: [] } as never;
    controller.submitTest(dto, user);
    expect(service.submitTest).toHaveBeenCalledWith(dto, 'u1');
  });
});
