import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const sampleUser = {
  id: 'u1',
  email: 'student@example.com',
  password: 'hashed-secret',
  level: 'A2',
  onboardedAt: null,
  dailyGoal: 20,
  role: 'USER',
  emailVerifiedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  passwordChangedAt: new Date('2026-01-01'),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<
    Pick<
      UsersService,
      | 'findByIdOrThrow'
      | 'update'
      | 'completeOnboarding'
      | 'changePassword'
      | 'deleteAccount'
    >
  >;
  const current = { id: 'u1' };

  beforeEach(() => {
    service = {
      findByIdOrThrow: jest.fn().mockResolvedValue(sampleUser),
      update: jest.fn().mockResolvedValue(sampleUser),
      completeOnboarding: jest.fn().mockResolvedValue(sampleUser),
      changePassword: jest.fn().mockResolvedValue(undefined),
      deleteAccount: jest.fn().mockResolvedValue(undefined),
    } as never;
    controller = new UsersController(service as unknown as UsersService);
  });

  it('me returns a UserResponseDto stripped of the password', async () => {
    const result = await controller.me(current);

    expect(service.findByIdOrThrow).toHaveBeenCalledWith('u1');
    expect(result.id).toBe('u1');
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  it('updateMe forwards the dto and serialises the result', async () => {
    const dto = { dailyGoal: 30 } as never;
    const result = await controller.updateMe(current, dto);

    expect(service.update).toHaveBeenCalledWith('u1', dto);
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  it('onboarding forwards the dto to completeOnboarding', async () => {
    const dto = { level: 'A2', deckIds: [] } as never;
    await controller.onboarding(current, dto);

    expect(service.completeOnboarding).toHaveBeenCalledWith('u1', dto);
  });

  it('changePassword delegates and returns a success message', async () => {
    const dto = { currentPassword: 'a', newPassword: 'b' } as never;
    const result = await controller.changePassword(current, dto);

    expect(service.changePassword).toHaveBeenCalledWith('u1', dto);
    expect(result).toEqual({ message: 'Password updated successfully' });
  });

  it('deleteMe delegates with the current password and returns a message', async () => {
    const dto = { currentPassword: 'a' } as never;
    const result = await controller.deleteMe(current, dto);

    expect(service.deleteAccount).toHaveBeenCalledWith('u1', 'a');
    expect(result).toEqual({ message: 'Account deleted' });
  });
});
