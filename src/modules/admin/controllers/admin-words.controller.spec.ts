import { AdminWordsController } from './admin-words.controller';
import { AdminService } from '../admin.service';

describe('AdminWordsController', () => {
  let controller: AdminWordsController;
  let service: jest.Mocked<
    Pick<AdminService, 'listWords' | 'createWord' | 'updateWord' | 'deleteWord'>
  >;

  beforeEach(() => {
    service = {
      listWords: jest.fn(),
      createWord: jest.fn(),
      updateWord: jest.fn(),
      deleteWord: jest.fn(),
    };
    controller = new AdminWordsController(service as unknown as AdminService);
  });

  it('list delegates with the query', async () => {
    const q = { page: 1 } as never;
    await controller.list(q);
    expect(service.listWords).toHaveBeenCalledWith(q);
  });

  it('create delegates with the dto', async () => {
    const dto = { word: 'a', translation: 'b' } as never;
    await controller.create(dto);
    expect(service.createWord).toHaveBeenCalledWith(dto);
  });

  it('update delegates with id and dto', async () => {
    const dto = { word: 'x' } as never;
    await controller.update('w1', dto);
    expect(service.updateWord).toHaveBeenCalledWith('w1', dto);
  });

  it('remove delegates with the id', async () => {
    await controller.remove('w1');
    expect(service.deleteWord).toHaveBeenCalledWith('w1');
  });
});
