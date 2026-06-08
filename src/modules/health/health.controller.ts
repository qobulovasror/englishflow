import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

interface HealthCheckResponse {
  status: 'ok';
  uptimeSeconds: number;
  db: 'ok';
}

@ApiTags('Health')
@Controller()
export class HealthController {
  private readonly bootTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness — process is running and routes are responsive. No DB query.
   * Use this as the Kubernetes livenessProbe / load balancer ping endpoint.
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Liveness probe — does the API process respond?' })
  live(): { status: 'ok'; uptimeSeconds: number } {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - this.bootTime) / 1000),
    };
  }

  /**
   * Readiness — process is up AND the database is reachable. Fail this if
   * Postgres is unavailable so the orchestrator stops routing traffic to a
   * node that can't actually serve requests.
   */
  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Readiness probe — API + database reachable' })
  async ready(): Promise<HealthCheckResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        db: 'unreachable',
      });
    }
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - this.bootTime) / 1000),
      db: 'ok',
    };
  }
}
