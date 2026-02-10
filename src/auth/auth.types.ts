export type GoalType =
  | 'weight_loss'
  | 'weight_gain'
  | 'healthy_eating'
  | 'maintain_weight';

export type AuthProviderType = 'local' | 'google' | 'apple';

export const GOAL_VALUES: readonly GoalType[] = [
  'weight_loss',
  'weight_gain',
  'healthy_eating',
  'maintain_weight',
] as const;

export const AUTH_PROVIDER_VALUES: readonly AuthProviderType[] = [
  'local',
  'google',
  'apple',
] as const;

export type JwtPayload = {
  sub: string;
  email: string;
};

export type OAuthUser = {
  email: string;
  name?: string;
  provider: Exclude<AuthProviderType, 'local'>;
};
