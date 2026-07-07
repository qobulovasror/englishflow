import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  ApiSuccessPrimitiveResponse,
} from '../../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../../common/swagger/api-error-response.dto';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { UpdateWordDto } from '../../words/dto/update-word.dto';
import { AdminService } from '../admin.service';
import { AdminWordQueryDto } from '../dto/admin-word-query.dto';
import { AdminWordResponseDto } from '../dto/admin-word-response.dto';
import { CreateAdminWordDto } from '../dto/create-admin-word.dto';
import { ImportWordsDto } from '../dto/import-words.dto';
import { ImportWordsResultDto } from '../dto/import-words-response.dto';

/** Global word administration. ADMIN-only (JwtAuthGuard + RolesGuard). */
@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/words')
export class AdminWordsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List all words with search, deck filter and paging (admin)' })
  @ApiPaginatedResponse(AdminWordResponseDto, { description: 'Page of words' })
  list(
    @Query() query: AdminWordQueryDto,
  ): Promise<PaginatedResponseDto<AdminWordResponseDto>> {
    return this.adminService.listWords(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a curated word (admin)' })
  @ApiSuccessResponse(AdminWordResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Word created',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck not found',
    type: ApiErrorResponseDto,
  })
  create(@Body() dto: CreateAdminWordDto): Promise<AdminWordResponseDto> {
    return this.adminService.createWord(dto);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Bulk-import curated words from a parsed CSV/JSON file (admin)',
  })
  @ApiSuccessResponse(ImportWordsResultDto, {
    status: HttpStatus.CREATED,
    description: 'Import summary (imported / skipped counts)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck not found',
    type: ApiErrorResponseDto,
  })
  importWords(@Body() dto: ImportWordsDto): Promise<ImportWordsResultDto> {
    return this.adminService.importWords(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit any word (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminWordResponseDto, { description: 'The updated word' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Word not found',
    type: ApiErrorResponseDto,
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWordDto,
  ): Promise<AdminWordResponseDto> {
    return this.adminService.updateWord(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete any word (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessPrimitiveResponse({
    description: 'Word deleted',
    example: { message: 'Word deleted' },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Word not found',
    type: ApiErrorResponseDto,
  })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string }> {
    return this.adminService.deleteWord(id);
  }
}
