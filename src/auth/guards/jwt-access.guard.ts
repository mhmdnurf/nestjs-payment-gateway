import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

type AccessTokenPayload = {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
};

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AccessTokenPayload }>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) {
      throw new InternalServerErrorException(
        'JWT_ACCESS_SECRET is not configured',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        { secret },
      );
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const auth = request.get('authorization');

    if (!auth) return null;

    const [type, token] = auth.split(' ');
    if (type !== 'Bearer' || !token) return null;

    return token;
  }
}
