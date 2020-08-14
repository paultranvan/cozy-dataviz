import React from 'react'
import Plot from 'react-plotly.js'
import { Query } from 'cozy-client'


// const query = client =>
//   client
//     .all(DOCTYPE_TS)
//     .where({
//       _id: {
//         $gt: null
//       }
//     })
//     .indexFields(['_id'])

const Graph = ({}) => {
  return(
    <Plot
      data={[
        {
          x: [1, 2, 3],
          y: [2, 6, 3],
          type: 'scatter',
          mode: 'lines+markers',
          marker: {color: 'red'},
        },
        {type: 'bar', x: [1, 2, 3], y: [2, 5, 3]},
      ]}
      layout={ { title: 'A Fancy Plot'} }
    />
  )
}
/*
class App extends React.Component {
  render() {
    return (
      <Plot
        data={[
          {
            x: [1, 2, 3],
            y: [2, 6, 3],
            type: 'scatter',
            mode: 'lines+markers',
            marker: {color: 'red'},
          },
          {type: 'bar', x: [1, 2, 3], y: [2, 5, 3]},
        ]}
        layout={ {width: 320, height: 240, title: 'A Fancy Plot'} }
      />
    )
  }
}
*/
export default Graph