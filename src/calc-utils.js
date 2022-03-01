const median = (values) => {
  values.sort(function(a,b){
    return a-b;
  });
  var half = Math.floor(values.length / 2);
  
  if (values.length % 2)
    return round2Dec(values[half]);
  else
    return round2Dec((values[half - 1] + values[half]) / 2.0);
}

const average = (values) => {
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = (sum / values.length) || 0;
  return round2Dec(avg);
}

const max = (values) => {
  return round2Dec(Math.max(...values))
}

const min = (values) => {
  return round2Dec(Math.min(...values));
}

const round2Dec = (value) => {
  return Math.round(value * 100) / 100;
}

exports.median = median;
exports.average = average;
exports.min = min;
exports.max = max;