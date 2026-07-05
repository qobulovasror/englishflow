import { AdminDecksController } from './admin-decks.controller';
import { DecksService } from '../../decks/decks.service';

describe('AdminDecksController', () => {
  let controller: AdminDecksController;
  let service: jest.Mocked<
    Pick<
      DecksService,
      | 'adminList'
      | 'adminFindOne'
      | 'adminCreate'
      | 'adminUpdate'
      | 'adminAddWords'
      | 'adminRemoveWord'
      | 'adminRemove'
    >
  >;

  beforeEach(() => {
    service = {
      adminList: jest.fn(),
      adminFindOne: jest.fn(),
      adminCreate: jest.fn(),
      adminUpdate: jest.fn(),
      adminAddWords: jest.fn(),
      adminRemoveWord: jest.fn(),
      adminRemove: jest.fn(),
    };
    controller = new AdminDecksController(service as unknown as DecksService);
  });

  it('list delegates to adminList', async () => {
    const q = { page: 1 } as never;
    await controller.list(q);
    expect(service.adminList).toHaveBeenCalledWith(q);
  });

  it('getOne delegates to adminFindOne', async () => {
    await controller.getOne('d1');
    expect(service.adminFindOne).toHaveBeenCalledWith('d1');
  });

  it('create delegates to adminCreate', async () => {
    const dto = { title: 'System deck' } as never;
    await controller.create(dto);
    expect(service.adminCreate).toHaveBeenCalledWith(dto);
  });

  it('update delegates to adminUpdate', async () => {
    const dto = { title: 'New' } as never;
    await controller.update('d1', dto);
    expect(service.adminUpdate).toHaveBeenCalledWith('d1', dto);
  });

  it('addWords delegates to adminAddWords with the deck id', async () => {
    const dto = { words: [] } as never;
    await controller.addWords('d1', dto);
    expect(service.adminAddWords).toHaveBeenCalledWith('d1', dto);
  });

  it('removeWord delegates to adminRemoveWord', async () => {
    await controller.removeWord('d1', 'w1');
    expect(service.adminRemoveWord).toHaveBeenCalledWith('d1', 'w1');
  });

  it('remove delegates to adminRemove with the deck id', async () => {
    await controller.remove('d1');
    expect(service.adminRemove).toHaveBeenCalledWith('d1');
  });
});
