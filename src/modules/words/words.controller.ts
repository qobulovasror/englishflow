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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WordsService } from './words.service';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { WordResponseDto } from './dto/word-response.dto';
import { WordQueryDto } from './dto/word-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiPaginatedResponse,
  ApiSuccessPrimitiveResponse,
  ApiSuccessResponse,
} from '../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../common/swagger/api-error-response.dto';

@ApiTags('Words')
@ApiBearerAuth('JWT')
@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new word in the user vocabulary' })
  @ApiSuccessResponse(WordResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Word created',
  })
  create(
    @Body() dto: CreateWordDto,
    @CurrentUser() user: { id: string },
  ): Promise<WordResponseDto> {
    return this.wordsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List words owned by the current user (paginated)' })
  @ApiPaginatedResponse(WordResponseDto)
  findAll(
    @CurrentUser() user: { id: string },
    @Query() query: WordQueryDto,
  ) {
    return this.wordsService.findAllByUser(user.id, query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a word owned by the current user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(WordResponseDto, {
    status: HttpStatus.OK,
    description: 'Word updated',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Word not found',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Word belongs to another user',
    type: ApiErrorResponseDto,
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWordDto,
    @CurrentUser() user: { id: string },
  ): Promise<WordResponseDto> {
    return this.wordsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a word owned by the current user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessPrimitiveResponse({
    description: 'Word deleted',
    example: { message: 'Word deleted successfully' },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Word not found',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Word belongs to another user',
    type: ApiErrorResponseDto,
  })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.wordsService.remove(id, user.id);
  }
}
