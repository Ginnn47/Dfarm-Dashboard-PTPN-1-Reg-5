import { use } from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent, TitleComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

export default defineNuxtPlugin(() => {
  // vue-echarts needs these features registered before chart components mount.
  use([
    CanvasRenderer,
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    TitleComponent,
    DataZoomComponent,
    MarkLineComponent,
  ])
})
