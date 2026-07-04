import { Role } from '@prisma/client';
import { AdminUsersController } from './admin-users.controller';
import { AdminService } from '../admin.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let service: jest.Mocked<
    Pick<
      AdminService,
      'listUsers' | 'getUser' | 'changeRole' | 'verifyUserEmail' | 'deleteUser'
    >
  >;
  const acting: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: Role.ADMIN,
  };

  beforeEach(() => {
    service = {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      changeRole: jest.fn(),
      verifyUserEmail: jest.fn(),
      deleteUser: jest.fn(),
    };
    controller = new AdminUsersController(service as unknown as AdminService);
  });

  it('list delegates with the query', async () => {
    const q = { page: 1 } as never;
    await controller.list(q);
    expect(service.listUsers).toHaveBeenCalledWith(q);
  });

  it('getOne delegates with the id', async () => {
    await controller.getOne('u1');
    expect(service.getUser).toHaveBeenCalledWith('u1');
  });

  it('changeRole passes the acting user id', async () => {
    await controller.changeRole('u1', { role: Role.ADMIN }, acting);
    expect(service.changeRole).toHaveBeenCalledWith('u1', Role.ADMIN, 'admin-1');
  });

  it('verifyEmail delegates with the id', async () => {
    await controller.verifyEmail('u1');
    expect(service.verifyUserEmail).toHaveBeenCalledWith('u1');
  });

  it('remove passes the acting user id', async () => {
    await controller.remove('u1', acting);
    expect(service.deleteUser).toHaveBeenCalledWith('u1', 'admin-1');
  });
});
