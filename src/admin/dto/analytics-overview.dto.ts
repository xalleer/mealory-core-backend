import { ApiProperty } from '@nestjs/swagger';

class UsersAnalyticsDto {
  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  active!: number;

  @ApiProperty({ type: Number })
  newThisWeek!: number;

  @ApiProperty({ type: Number })
  withFamilies!: number;
}

class FamiliesAnalyticsDto {
  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  active!: number;

  @ApiProperty({ type: Number })
  avgSize!: number;
}

class SubscriptionsAnalyticsDto {
  @ApiProperty({ type: Number })
  free!: number;

  @ApiProperty({ type: Number })
  pro!: number;

  @ApiProperty({ type: Number })
  familyPro!: number;
}

class MenusAnalyticsDto {
  @ApiProperty({ type: Number })
  generatedLast30Days!: number;

  @ApiProperty({ type: Number })
  avgPerFamily!: number;
}

class ProductsAnalyticsDto {
  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  active!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byCategory!: Record<string, number>;
}

export class AnalyticsOverviewDto {
  @ApiProperty({ type: UsersAnalyticsDto })
  users!: UsersAnalyticsDto;

  @ApiProperty({ type: FamiliesAnalyticsDto })
  families!: FamiliesAnalyticsDto;

  @ApiProperty({ type: SubscriptionsAnalyticsDto })
  subscriptions!: SubscriptionsAnalyticsDto;

  @ApiProperty({ type: MenusAnalyticsDto })
  menus!: MenusAnalyticsDto;

  @ApiProperty({ type: ProductsAnalyticsDto })
  products!: ProductsAnalyticsDto;
}
