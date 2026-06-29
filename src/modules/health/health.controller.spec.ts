import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn() };
    controller = new HealthController(prisma as unknown as PrismaService);
  });

  describe('live', () => {
    it('reports ok with a non-negative uptime and no DB query', () => {
      const res = controller.live();

      expect(res.status).toBe('ok');
      expect(res.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('ready', () => {
    it('reports ok with db ok when the DB query succeeds', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const res = await controller.ready();

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(res).toMatchObject({ status: 'ok', db: 'ok' });
      expect(res.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('throws ServiceUnavailable when the DB is unreachable', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

      await expect(controller.ready()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
