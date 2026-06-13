import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { DeckQueryDto } from './dto/deck-query.dto';
import {
  DeckResponseDto,
  DeckDetailResponseDto,
  EnrollResponseDto,
} from './dto/deck-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiPaginatedResponse,
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
}
