import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import { AddFavoriteDto } from '../../application/dto/add-favorite.dto';
import { FavoritesService } from '../../application/services/favorites.service';

@ApiTags('Store Favorites')
@ApiBearerAuth()
@Controller('store/favorites')
@UserTypes('CUSTOMER')
export class StoreFavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos favoritos del cliente' })
  listFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.favoritesService.listFavorites(user.id, query);
  }

  @Get('ids')
  @ApiOperation({ summary: 'IDs de productos favoritos (estado del corazón)' })
  listFavoriteIds(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.listFavoriteIds(user.id);
  }

  @Get('count')
  @ApiOperation({ summary: 'Cantidad de favoritos activos' })
  countFavorites(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.countFavorites(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Agregar producto a favoritos' })
  addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddFavoriteDto,
  ) {
    return this.favoritesService.addFavorite(user.id, dto.productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Quitar producto de favoritos' })
  removeFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.removeFavorite(user.id, productId);
  }
}
