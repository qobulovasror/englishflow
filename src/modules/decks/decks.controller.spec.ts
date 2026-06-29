import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';

describe('DecksController', () => {
  let controller: DecksController;
  let service: jest.Mocked<
    Pick<
      DecksService,
      | 'findAll'
      | 'findMine'
      | 'create'
      | 'findOne'
      | 'enroll'
      | 'update'
      | 'remove'
      | 'addWords'
      | 'removeWord'
    >
  >;
  const user = { id: 'u1' };

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findMine: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      enroll: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addWords: jest.fn(),
      removeWord: jest.fn(),
    };
    controller = new DecksController(service as unknown as DecksService);
  });

  it('findAll forwards the user id and query', () => {
    const query = { page: 1 } as never;
    controller.findAll(user, query);
    expect(service.findAll).toHaveBeenCalledWith('u1', query);
  });

  it('findMine forwards the user id', () => {
    controller.findMine(user);
    expect(service.findMine).toHaveBeenCalledWith('u1');
  });

  it('create forwards the dto and user id', async () => {
    const dto = { title: 'My deck' } as never;
    await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith(dto, 'u1');
  });

  it('findOne forwards id and user id', () => {
    controller.findOne('d1', user);
    expect(service.findOne).toHaveBeenCalledWith('d1', 'u1');
  });

  it('enroll forwards id and user id', () => {
    controller.enroll('d1', user);
    expect(service.enroll).toHaveBeenCalledWith('d1', 'u1');
  });

  it('update forwards id, dto and user id', async () => {
    const dto = { title: 'x' } as never;
    await controller.update('d1', dto, user);
    expect(service.update).toHaveBeenCalledWith('d1', dto, 'u1');
  });

  it('remove forwards id and user id', () => {
    controller.remove('d1', user);
    expect(service.remove).toHaveBeenCalledWith('d1', 'u1');
  });

  it('addWords forwards id, dto and user id', async () => {
    const dto = { wordIds: ['w1'] } as never;
    await controller.addWords('d1', dto, user);
    expect(service.addWords).toHaveBeenCalledWith('d1', dto, 'u1');
  });

  it('removeWord forwards deck id, word id and user id', () => {
    controller.removeWord('d1', 'w1', user);
    expect(service.removeWord).toHaveBeenCalledWith('d1', 'w1', 'u1');
  });
});
