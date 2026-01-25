import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { RunSimulationDto } from './dto/run-simulation.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('simulation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run a new stock market simulation' })
  @ApiResponse({
    status: 201,
    description: 'The simulation has been successfully created.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  async runSimulation(
    @Request() req,
    @Body() runSimulationDto: RunSimulationDto,
  ) {
    const userId = req.user.id;
    const { ticker, scenario } = runSimulationDto;
    return this.simulationService.runSimulation(userId, ticker, scenario);
  }
}
