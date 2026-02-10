import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';

interface AppleStrategyOptions {
  clientID: string;
  teamID: string;
  keyID: string;
  privateKeyString?: string;
  callbackURL: string;
  scope?: string[];
  passReqToCallback?: boolean;
}

type AppleProfileName = {
  firstName?: string;
  lastName?: string;
};

type AppleProfile = {
  email?: string;
  name?: AppleProfileName;
};

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor() {
    const clientID = process.env.APPLE_CLIENT_ID;
    const teamID = process.env.APPLE_TEAM_ID;
    const keyID = process.env.APPLE_KEY_ID;
    const privateKeyString = process.env.APPLE_PRIVATE_KEY;
    const callbackURL = process.env.APPLE_CALLBACK_URL;

    if (!clientID || !teamID || !keyID || !privateKeyString || !callbackURL) {
      const options: AppleStrategyOptions = {
        clientID: 'disabled',
        teamID: 'disabled',
        keyID: 'disabled',
        privateKeyString: 'disabled',
        callbackURL: 'disabled',
      };
      super(options as any);
      return;
    }

    const options: AppleStrategyOptions = {
      clientID,
      teamID,
      keyID,
      privateKeyString,
      callbackURL,
      scope: ['email', 'name'],
      passReqToCallback: false,
    };
    super(options as any);
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    _idToken: unknown,
    profile: unknown,
    done: (err: unknown, user?: unknown) => void,
  ) {
    const p = (profile ?? {}) as AppleProfile;
    const email = p.email;
    const name = p.name
      ? [p.name.firstName, p.name.lastName].filter(Boolean).join(' ')
      : undefined;

    done(null, { email, name, provider: 'apple' });
  }
}
