import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { WordsService } from './words.service';
import { CreateWordDto } from './dto/create-word.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('words')
@UseGuards(JwtAuthGuard)
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post()
  async create(@Body() dto: CreateWordDto, @CurrentUser() user: { id: string }) {
    return this.wordsService.create(dto, user.id);
  }

  @Get()
  async findAll(@CurrentUser() user: { id: string }) {
    return this.wordsService.findAllByUser(user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.wordsService.remove(id, user.id);
  }
}
