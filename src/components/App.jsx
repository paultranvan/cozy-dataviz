import React from 'react'
import { hot } from 'react-hot-loader'
import Graph from 'components/Graph'

const App = () => {
  return (
    <div align="center">
      <div>
        <h1>Energy consumption</h1>
        <Graph dataType="electricity" aggregationLevel="byYear" />
      </div>
      <div>
        <h1>Gas consumption</h1>
        <Graph dataType="gas" aggregationLevel="byYear" />
      </div>
    </div>
  )
}

/*
  Enable Hot Module Reload type="electricity" aggregationLevel="agg_by_month"using `react-hot-loader` here
  We enable it here since App is the main root component
  No need to use it anywhere else, it sould work for all
  child components
*/
export default hot(module)(App)
