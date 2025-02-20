//import Aurelia from 'aurelia';
import Aurelia, { StyleConfiguration } from 'aurelia';
import { MyApp } from './my-app';
import { Chartjs } from './components/chartjs';
import { ChartjsGeo } from './components/chartjs-geo';
import { ChartjsScatter } from './components/chartjs-scatter';
import { Table } from './components/table';
import { Network} from './components/network';
import { Tabs} from './components/tabs';
import { TableNetwork} from './components/table-network';
import { TableFiltered} from './components/table-filtered';
import { PdfUploader } from './components/pdf-uploader';

Aurelia
.register(StyleConfiguration.shadowDOM({
  // Configuration options here
}))
.register(Chartjs)
.register(ChartjsScatter)
.register(Table)
.register(ChartjsGeo)
.register(Network)
.register(Tabs)
.register(TableNetwork)
.register(TableFiltered)
.register(PdfUploader)
  .app(MyApp)
  .start();
