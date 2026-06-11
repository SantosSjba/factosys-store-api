import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { FavoritesService } from './application/services/favorites.service';
import { PrismaFavoriteRepository } from './infrastructure/repositories/prisma-favorite.repository';
import { StoreFavoritesController } from './presentation/controllers/store-favorites.controller';

@Module({
  imports: [CatalogModule],
  controllers: [StoreFavoritesController],
  providers: [PrismaFavoriteRepository, FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
