import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtConfig } from '../../../config/configuration';

interface JwtPayload {
  sub: string;
  email: string;
  /** Issued-at, seconds since epoch — populated by `jsonwebtoken`. */
  iat: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<JwtConfig>('jwt').secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    // Reject tokens issued before the latest password change. Note `iat` is
    // in seconds and `passwordChangedAt` in ms — divide by 1000 first.
    const passwordChangedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (payload.iat < passwordChangedAtSec) {
      throw new UnauthorizedException('Token issued before last password change');
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
