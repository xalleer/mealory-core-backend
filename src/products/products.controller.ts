import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CreateProductDto } from './dto/create-product.dto';
import {
  ProductListResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import {
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_SORT_BY_VALUES,
} from './products.types';
import type {
  ProductCategoryType,
  ProductSortByType,
  ProductSortOrderType,
} from './products.types';

class ProductsQueryDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: PRODUCT_CATEGORY_VALUES })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORY_VALUES)
  category?: ProductCategoryType;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return false;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PRODUCT_SORT_BY_VALUES })
  @IsOptional()
  @IsIn(PRODUCT_SORT_BY_VALUES)
  sortBy?: ProductSortByType;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: ProductSortOrderType;
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiCreatedResponse({ type: ProductResponseDto })
  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @ApiOkResponse({ type: ProductListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: PRODUCT_CATEGORY_VALUES,
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: PRODUCT_SORT_BY_VALUES })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @Get()
  async findAll(@Query() query: ProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @ApiOkResponse({ type: ProductResponseDto })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @ApiOkResponse({ type: ProductResponseDto })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @ApiOkResponse({ type: ProductResponseDto })
  @Patch(':id/price')
  async updatePrice(@Param('id') id: string, @Body() dto: UpdatePriceDto) {
    return this.productsService.updatePrice(id, dto);
  }

  @ApiOkResponse({ type: ProductResponseDto })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
