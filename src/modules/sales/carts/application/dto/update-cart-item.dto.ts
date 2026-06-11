import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 0, maximum: 99 })
  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}
