import { Provider, Injectable } from '@opensumi/di';
import { BrowserModule } from '@opensumi/ide-core-browser';

import { CustomRightContribution } from './index.contribution';

@Injectable()
export class CustomLeftModule extends BrowserModule {
  providers: Provider[] = [CustomRightContribution];
}
