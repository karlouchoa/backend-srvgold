import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncRecordsDto } from './dto/sync-records.dto';
import { SyncQueryDto } from './dto/sync-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get(':entity')
  @ApiOperation({ summary: 'Recupera registros paginados de uma entidade com base em updatedAt/deletedAt.' })
  @ApiParam({ name: 'entity', description: 'Entidade alvo da sincronização.' })
  @ApiQuery({ name: 'since', required: false, description: 'Filtro por data/hora (ISO 8601).' })
  @ApiQuery({ name: 'limit', required: false, description: 'Quantidade máxima de registros.', schema: { type: 'integer', minimum: 1, default: 100 } })
  @ApiQuery({ name: 'offset', required: false, description: 'Deslocamento para paginação.', schema: { type: 'integer', minimum: 0, default: 0 } })
  async pull(
    @Param('entity') entity: string,
    @Query() query: SyncQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.syncService.pull(entity, query, user);
  }

  @Post(':entity')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Recebe registros para persistência a partir do Escritório ou PDV.' })
  @ApiParam({ name: 'entity', description: 'Entidade alvo da sincronização.' })
  async push(@Param('entity') entity: string, @Body() payload: SyncRecordsDto, @CurrentUser() user: JwtPayload) {
    return this.syncService.push(entity, payload, user);
  }
}
