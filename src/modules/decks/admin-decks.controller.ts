import {
  Body,
  Controller,
  Delete,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { DecksService } from './decks.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { AddDeckWordsDto } from './dto/add-deck-words.dto';
import {
  DeckResponseDto,
  AddDeckWordsResponseDto,
} from './dto/deck-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ApiSuccessPrimitiveResponse,
  ApiSuccessResponse,
} from '../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../common/swagger/api-error-response.dto';

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
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Requires the ADMIN role',
    type: ApiErrorResponseDto,
  })
  addWords(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddDeckWordsDto,
  ): Promise<AddDeckWordsResponseDto> {
    return this.decksService.adminAddWords(id, dto);
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
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Requires the ADMIN role',
    type: ApiErrorResponseDto,
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.decksService.adminRemove(id);
  }
}
