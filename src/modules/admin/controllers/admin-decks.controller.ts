import {
  Body,
  Controller,
  Delete,
  Get,
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
import { DecksService } from '../../decks/decks.service';
import { CreateDeckDto } from '../../decks/dto/create-deck.dto';
import { UpdateDeckDto } from '../../decks/dto/update-deck.dto';
import { AddDeckWordsDto } from '../../decks/dto/add-deck-words.dto';
import { DeckQueryDto } from '../../decks/dto/deck-query.dto';
import {
  DeckResponseDto,
  AddDeckWordsResponseDto,
} from '../../decks/dto/deck-response.dto';
import {
  AdminDeckRowDto,
  AdminDeckDetailDto,
} from '../../decks/dto/admin-deck-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  ApiPaginatedResponse,
  ApiSuccessPrimitiveResponse,
  ApiSuccessResponse,
} from '../../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../../common/swagger/api-error-response.dto';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';

/**
 * Curated-content management. Every route requires an ADMIN role: `JwtAuthGuard`
 * authenticates, then `RolesGuard` checks `@Roles(Role.ADMIN)`. These bypass the
 * per-user ownership rules that govern the public `/decks` controller.
 */
@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/decks')
export class AdminDecksController {
  constructor(private readonly decksService: DecksService) {}

  @Get()
  @ApiOperation({
    summary: 'List every deck (system + user) with owner context (admin)',
  })
  @ApiPaginatedResponse(AdminDeckRowDto, { description: 'Page of decks' })
  list(
    @Query() query: DeckQueryDto,
  ): Promise<PaginatedResponseDto<AdminDeckRowDto>> {
    return this.decksService.adminList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deck with its full word list (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminDeckDetailDto, {
    description: 'The deck and its words',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck not found',
    type: ApiErrorResponseDto,
  })
  getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AdminDeckDetailDto> {
    return this.decksService.adminFindOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a curated system deck (admin)' })
  @ApiSuccessResponse(DeckResponseDto, {
    status: HttpStatus.CREATED,
    description: 'System deck created',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Requires the ADMIN role',
    type: ApiErrorResponseDto,
  })
  create(@Body() dto: CreateDeckDto): Promise<DeckResponseDto> {
    return this.decksService.adminCreate(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any deck (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminDeckRowDto, { description: 'The updated deck' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck not found',
    type: ApiErrorResponseDto,
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDeckDto,
  ): Promise<AdminDeckRowDto> {
    return this.decksService.adminUpdate(id, dto);
  }

  @Post(':id/words')
  @ApiOperation({ summary: 'Add words to any deck (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AddDeckWordsResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Words added',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck not found',
    type: ApiErrorResponseDto,
  })
  addWords(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddDeckWordsDto,
  ): Promise<AddDeckWordsResponseDto> {
    return this.decksService.adminAddWords(id, dto);
  }

  @Delete(':id/words/:wordId')
  @ApiOperation({ summary: 'Remove a single word from any deck (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'wordId', format: 'uuid' })
  @ApiSuccessPrimitiveResponse({
    description: 'Word removed',
    example: { message: 'Word removed from deck' },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck or word not found',
    type: ApiErrorResponseDto,
  })
  removeWord(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('wordId', new ParseUUIDPipe()) wordId: string,
  ): Promise<{ message: string }> {
    return this.decksService.adminRemoveWord(id, wordId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete any deck (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessPrimitiveResponse({
    description: 'Deck deleted',
    example: { message: 'Deck deleted successfully' },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck not found',
    type: ApiErrorResponseDto,
  })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string }> {
    return this.decksService.adminRemove(id);
  }
}
