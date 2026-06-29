import { WordsController } from './words.controller';
import { WordsService } from './words.service';

describe('WordsController', () => {
  let controller: WordsController;
  let service: jest.Mocked<Pick<WordsService, 'create' | 'findAllByUser' | 'update' | 'remove'>>;
  const user = { id: 'u1' };

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new WordsController(service as unknown as WordsService);
  });

  it('create delegates to the service with the dto and user id', async () => {
    const created = { id: 'w1' };
    service.create.mockResolvedValue(created as never);
    const dto = { word: 'hello', translation: 'salom' } as never;

    await expect(controller.create(dto, user)).resolves.toBe(created);
    expect(service.create).toHaveBeenCalledWith(dto, 'u1');
  });

  it('findAll passes the user id and query through', () => {
    const query = { page: 1 } as never;
    controller.findAll(user, query);
    expect(service.findAllByUser).toHaveBeenCalledWith('u1', query);
  });

  it('update forwards id, dto and user id', async () => {
    const dto = { translation: 'x' } as never;
    await controller.update('w1', dto, user);
    expect(service.update).toHaveBeenCalledWith('w1', dto, 'u1');
  });

  it('remove forwards id and user id', () => {
    controller.remove('w1', user);
    expect(service.remove).toHaveBeenCalledWith('w1', 'u1');
  });
});
