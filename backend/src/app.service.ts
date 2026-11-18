import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  salud() {
    return { servicio: 'SIModpersonal', estado: 'ok' };
  }
}
