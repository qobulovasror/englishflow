import { AdminDecksController } from './admin-decks.controller';
import { DecksService } from './decks.service';

describe('AdminDecksController', () => {
  let controller: AdminDecksController;
  let service: jest.Mocked<
    Pick<DecksService, 'adminCreate' | 'adminAddWords' | 'adminRemove'>
  >;

  beforeEach(() => {
    service = {
      adminCreate: jest.fn(),
      adminAddWords: jest.fn(),
      adminRemove: jest.fn(),
    };
    controller = new AdminDecksController(service as unknown as DecksService);
  });

  it('create delegates to adminCreate', async () => {
    const dto = { title: 'System deck' } as never;
    await controller.create(dto);
    expect(service.adminCreate).toHaveBeenCalledWith(dto);
  });

  it('addWords delegates to adminAddWords with the deck id', async () => {
    const dto = { wordIds: ['w1'] } as never;
    await controller.addWords('d1', dto);
    expect(service.adminAddWords).toHaveBeenCalledWith('d1', dto);
  });

  it('remove delegates to adminRemove with the deck id', () => {
    controller.remove('d1');
    expect(service.adminRemove).toHaveBeenCalledWith('d1');
  });
});
