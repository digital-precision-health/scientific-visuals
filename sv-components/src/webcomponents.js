
import { WcCustomElementRegistry } from '@aurelia/web-components'; 
import { DI, Registration  } from '@aurelia/kernel';
import { StandardConfiguration, IPlatform } from '@aurelia/runtime-html';
import {BrowserPlatform} from '@aurelia/platform-browser'

// Create the Aurelia container
const container = DI.createContainer();
// Register the platform
container.register(
  Registration.instance(IPlatform, BrowserPlatform.getOrCreate(globalThis)));
// Register the StandardConfiguration
container.register(StandardConfiguration); // This registers core services like IExpressionParser
const registry = container.get(WcCustomElementRegistry);

import { Chartjs } from './components/chartjs';
import { ChartjsScatter } from './components/chartjs-scatter';
import { Table} from './components/table';
import { ChartjsGeo } from './components/chartjs-geo';
import { Network } from './components/network';
import { TableNetwork } from './components/table-network';
import { Tabs } from './components/tabs';

registry.define('sv-chartjs', Chartjs);
registry.define('sv-chartjs-scatter', ChartjsScatter);
registry.define('sv-table', Table);
registry.define('sv-geochart', ChartjsGeo);
registry.define('sv-network', Network);
registry.define('sv-table-network', TableNetwork);
registry.define('sv-tabs', Tabs);
