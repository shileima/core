import { Provider, Injectable } from '@opensumi/di';
import { BrowserModule } from '@opensumi/ide-core-browser';

import { BuiltinServicesContribution } from './project-init.contribution';

@Injectable()
export class BuitinServicesSampleModule extends BrowserModule {
  providers: Provider[] = [BuiltinServicesContribution];
}
