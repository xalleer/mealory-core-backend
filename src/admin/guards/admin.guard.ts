import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: unknown }>();
    const user = request.user;

    if (typeof user !== 'object' || user === null) {
      return false;
    }

    const role = (user as { role?: unknown }).role;
    return role === 'admin' || role === 'super_admin';
  }
}
