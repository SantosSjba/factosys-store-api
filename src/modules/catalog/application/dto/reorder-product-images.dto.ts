import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderProductImagesDto {
  @ApiProperty({
    type: [String],
    description: 'IDs de imágenes en el orden deseado',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  imageIds!: string[];
}
