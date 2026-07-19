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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DecksService } from './decks.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { AddDeckWordsDto } from './dto/add-deck-words.dto';
import { DeckQueryDto } from './dto/deck-query.dto';
import {
  DeckResponseDto,
  DeckDetailResponseDto,
  EnrollResponseDto,
  AddDeckWordsResponseDto,
} from './dto/deck-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiPaginatedResponse,
  ApiSuccessPrimitiveResponse,
  ApiSuccessResponse,
} from '../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../common/swagger/api-error-response.dto';

@ApiTags('Decks')
@ApiBearerAuth('JWT')
@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Get()
  @ApiOperation({ summary: 'Browse system and public decks (paginated)' })
  @ApiPaginatedResponse(DeckResponseDto)
  findAll(@CurrentUser() user: { id: string }, @Query() query: DeckQueryDto) {
    return this.decksService.findAll(user.id, query);
  }

  // Declared before ':id' so the literal path isn't captured as a uuid param.
  @Get('mine')
  @ApiOperation({ summary: 'Decks the current user has joined or created' })
  @ApiSuccessResponse(DeckResponseDto, { isArray: true })
  findMine(@CurrentUser() user: { id: string }) {
    return this.decksService.findMine(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a personal deck' })
  @ApiSuccessResponse(DeckResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Deck created',
  })
  create(
    @Body() dto: CreateDeckDto,
    @CurrentUser() user: { id: string },
  ): Promise<DeckResponseDto> {
    return this.decksService.create(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Deck detail with its words' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(DeckDetailResponseDto)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck not found',
    type: ApiErrorResponseDto,
  })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.decksService.findOne(id, user.id);
  }

  @Post(':id/enroll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Join a deck — adds its words to your learning list',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(EnrollResponseDto)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck not found',
    type: ApiErrorResponseDto,
  })
  enroll(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.decksService.enroll(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a deck the current user created' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(DeckResponseDto, { description: 'Deck updated' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck not found',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only edit your own decks',
    type: ApiErrorResponseDto,
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDeckDto,
    @CurrentUser() user: { id: string },
  ): Promise<DeckResponseDto> {
    return this.decksService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deck the current user created' })
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
    description: 'You can only edit your own decks',
    type: ApiErrorResponseDto,
  })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.decksService.remove(id, user.id);
  }

  @Post(':id/words')
  @ApiOperation({ summary: 'Add words to a deck the current user created' })
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
    description: 'You can only edit your own decks',
    type: ApiErrorResponseDto,
  })
  addWords(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddDeckWordsDto,
    @CurrentUser() user: { id: string },
  ): Promise<AddDeckWordsResponseDto> {
    return this.decksService.addWords(id, dto, user.id);
  }

  @Delete(':id/words/:wordId')
  @ApiOperation({
    summary: 'Remove a word from a deck the current user created',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'wordId', format: 'uuid' })
  @ApiSuccessPrimitiveResponse({
    description: 'Word removed from deck',
    example: { message: 'Word removed from deck' },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deck or word not found',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only edit your own decks',
    type: ApiErrorResponseDto,
  })
  removeWord(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('wordId', new ParseUUIDPipe()) wordId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.decksService.removeWord(id, wordId, user.id);
  }
}
